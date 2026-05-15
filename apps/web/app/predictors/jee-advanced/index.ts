/**
 * JEE Advanced college predictor — IIT-only, AI quota
 * uses the shared JoSAA index loader; filters to IIT rows in JS after load
 */

import type { ExamPredictor } from "@ejam/data";
import {
  type CollegePredictionResult,
  type CollegePredictorFilters,
  type CollegePredictorIndexRow,
  type ProgramPrediction,
  getJosaaIndex,
  predictPrograms,
} from "@ejam/data/college-predictor";
import { z } from "zod";

const JeeAdvancedInput = z.object({
  rank: z.number().int().min(1).max(50000),
  seat_type: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  gender: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  filters: z
    .object({
      institute_type: z.array(z.string()).optional(),
      state: z.array(z.string()).optional(),
      branch_name: z.union([z.string(), z.array(z.string())]).optional(),
      band: z.array(z.enum(["safe", "target", "reach", "long-shot"])).optional(),
    })
    .optional(),
  has_ews_certificate: z.boolean().optional(),
  include_all: z.boolean().optional(),
});
type JeeAdvancedInput = z.infer<typeof JeeAdvancedInput>;

const JEE_ADVANCED_QUOTA = "AI";
const EWS_SEAT_TYPE = "Gen-EWS";
const EWS_CAVEAT =
  "EWS seats are only available to candidates holding a valid EWS certificate issued by a competent authority. These results assume you are EWS-eligible.";

type RegistryMaps = {
  instituteStates: Map<string, string>;
  programNames: Map<string, string>;
};

// in-memory server cache — keyed by FNV1a hash of canonical input
// sessionStorage is a no-op on the server; this Map persists for the process lifetime
// predictions are deterministic for a given index version, so no TTL is needed
const _serverCache = new Map<string, ProgramPrediction[]>();

let _cachedRegistry: RegistryMaps | null = null;

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableNormalize(entry)]),
    );
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function loadRegistryMaps(): Promise<RegistryMaps> {
  if (_cachedRegistry) return _cachedRegistry;

  const { readFileSync } = await import("node:fs");
  const { join, resolve } = await import("node:path");
  const registryRoot = process.env.EJAM_REGISTRY_ROOT ?? join(process.cwd(), "data", "registry");
  const institutes = JSON.parse(
    readFileSync(resolve(registryRoot, "engineering", "institutes.json"), "utf-8"),
  ) as Array<{ id: string; state: string }>;
  const programs = JSON.parse(
    readFileSync(resolve(registryRoot, "engineering", "programs.json"), "utf-8"),
  ) as Array<{ id: string; name: string }>;

  _cachedRegistry = {
    instituteStates: new Map(institutes.map((i) => [i.id, i.state])),
    programNames: new Map(programs.map((p) => [p.id, p.name])),
  };
  return _cachedRegistry;
}

function enrichRows(rows: CollegePredictorIndexRow[], registry: RegistryMaps): CollegePredictorIndexRow[] {
  return rows.map((row) => ({
    ...row,
    state: registry.instituteStates.get(row.institute_id),
    program_name: registry.programNames.get(row.program_id),
  }));
}

function resultFromCachedPrograms(
  cachedPrograms: ProgramPrediction[],
  filters: CollegePredictorFilters | undefined,
): CollegePredictionResult {
  return {
    programs: cachedPrograms,
    metadata: {
      total_matching: cachedPrograms.length,
      total_above_threshold: cachedPrograms.length,
      threshold_used: 0.1,
      hidden_count: 0,
      total_matching_programs: cachedPrograms.length,
      displayed_programs: cachedPrograms.length,
      hidden_programs: 0,
      active_filters: filters ?? {},
    },
    grouped_by_band: {
      safe: cachedPrograms.filter((p) => p.band === "safe"),
      target: cachedPrograms.filter((p) => p.band === "target"),
      reach: cachedPrograms.filter((p) => p.band === "reach"),
      "long-shot": cachedPrograms.filter((p) => p.band === "long-shot"),
    },
  };
}

export const predictor: ExamPredictor<JeeAdvancedInput, CollegePredictionResult> = {
  inputSchema: JeeAdvancedInput,

  async predict(input, deps) {
    const cacheInput = { exam_id: deps.examId, ...input, quota: JEE_ADVANCED_QUOTA };
    const cacheKey = fnv1a(stableStringify(cacheInput));
    const cachedPrograms = _serverCache.get(cacheKey);
    if (cachedPrograms) {
      return {
        result: resultFromCachedPrograms(cachedPrograms, input.filters),
        confidence: {
          level: cachedPrograms.length > 0 ? "medium" : "low",
          caveat: cachedPrograms.length > 0
            ? "probabilities are based on historical closing rank trends"
            : "no programs found above the probability threshold for this rank",
        },
      };
    }

    const [allRows, registry] = await Promise.all([getJosaaIndex(), loadRegistryMaps()]);
    // filter to IIT rows in JS — shared loader returns all instype values
    const iitRows = allRows.filter((row) => row.instype === "IIT");
    const enrichedRows = enrichRows(iitRows, registry);

    const result = predictPrograms({
      indexRows: enrichedRows,
      studentRank: input.rank,
      seatType: input.seat_type,
      quota: JEE_ADVANCED_QUOTA,
      gender: input.gender,
      includeAll: input.include_all,
      filters: input.filters,
    });

    if (input.has_ews_certificate) {
      const baseResult: CollegePredictionResult = {
        programs: result.programs,
        metadata: result.metadata,
        grouped_by_band: result.grouped_by_band,
      };
      result.ews_comparison = {
        base: baseResult,
        ews: predictPrograms({
          indexRows: enrichedRows,
          studentRank: input.rank,
          seatType: EWS_SEAT_TYPE,
          quota: JEE_ADVANCED_QUOTA,
          gender: input.gender,
          includeAll: input.include_all,
          filters: input.filters,
        }),
        caveat: EWS_CAVEAT,
      };
    }

    const confidence = result.metadata.total_above_threshold > 0
      ? { level: "medium" as const, caveat: "probabilities are based on historical closing rank trends" }
      : { level: "low" as const, caveat: "no programs found above the probability threshold for this rank" };

    _serverCache.set(cacheKey, result.programs);
    return { result, confidence };
  },
};
