/**
 * JEE Advanced college predictor — IIT-only, AI quota
 * uses the shared JoSAA index loader; filters to IIT rows in JS after load
 */

import type { ExamPredictor } from "@ejam/data";
import {
  type CollegePredictionResult,
  type CollegePredictorFilters,
  type CollegePredictorIndexRow,
  deriveConfidence,
  getPredictorIndexFromDeps,
  predictPrograms,
} from "@ejam/data/college-predictor";
import { z } from "zod";
import {
  finalizePredictionResult,
  resultFromRankedPrograms,
} from "@/predictors/shared/finalize-prediction";
import {
  indexShaFromDeps,
  type ServerCacheEntry,
} from "@/predictors/shared/predictor-cache";

const JeeAdvancedInput = z.object({
  rank: z.number().int().min(1).max(50000),
  seat_type: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  gender: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  filters: z
    .object({
      institute_type: z.array(z.string()).optional(),
      state: z.array(z.string()).optional(),
      branch_name: z.union([z.string(), z.array(z.string())]).optional(),
      band: z
        .array(z.enum(["safe", "target", "reach", "long-shot"]))
        .optional(),
    })
    .optional(),
  has_ews_certificate: z.boolean().optional(),
  include_all: z.boolean().optional(),
});
type JeeAdvancedInput = z.infer<typeof JeeAdvancedInput>;

const JEE_ADVANCED_QUOTA = "AI";
const EWS_SEAT_TYPE = "EWS";
const EWS_CAVEAT =
  "EWS seats are only available to candidates holding a valid EWS certificate issued by a competent authority. These results assume you are EWS-eligible.";

type RegistryMaps = {
  instituteStates: Map<string, string>;
  programNames: Map<string, string>;
  instituteNirf: Map<string, number | null | undefined>;
};

// in-memory server cache — keyed by FNV1a hash of canonical input
// sessionStorage is a no-op on the server; this Map persists for the process lifetime
// predictions are deterministic for a given index version, so no TTL is needed
const _serverCache = new Map<string, ServerCacheEntry>();

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
  const { resolve } = await import("node:path");
  const { resolveRegistryRoot } = await import("@ejam/data");
  const registryRoot = resolveRegistryRoot();
  const institutes = JSON.parse(
    readFileSync(
      resolve(registryRoot, "engineering", "institutes.json"),
      "utf-8",
    ),
  ) as Array<{ id: string; state: string; nirf_rank?: number | null }>;
  const programs = JSON.parse(
    readFileSync(
      resolve(registryRoot, "engineering", "programs.json"),
      "utf-8",
    ),
  ) as Array<{ id: string; name: string }>;

  _cachedRegistry = {
    instituteStates: new Map(institutes.map((i) => [i.id, i.state])),
    programNames: new Map(programs.map((p) => [p.id, p.name])),
    instituteNirf: new Map(institutes.map((i) => [i.id, i.nirf_rank ?? null])),
  };
  return _cachedRegistry;
}

function enrichRows(
  rows: CollegePredictorIndexRow[],
  registry: RegistryMaps,
): CollegePredictorIndexRow[] {
  return rows.map((row) => ({
    ...row,
    state: registry.instituteStates.get(row.institute_id),
    program_name: registry.programNames.get(row.program_id),
  }));
}

function resultFromCachedPrograms(
  cached: ServerCacheEntry,
  filters: CollegePredictorFilters | undefined,
): CollegePredictionResult {
  const result = resultFromRankedPrograms(cached.programs, filters);
  return cached.ews_comparison
    ? { ...result, ews_comparison: cached.ews_comparison }
    : result;
}

export const predictor: ExamPredictor<
  JeeAdvancedInput,
  CollegePredictionResult
> = {
  inputSchema: JeeAdvancedInput,

  async predict(input, deps) {
    const cacheInput = {
      exam_id: deps.examId,
      ...input,
      quota: JEE_ADVANCED_QUOTA,
    };
    const cacheKey = fnv1a(
      stableStringify({
        index_sha: indexShaFromDeps(deps),
        ...cacheInput,
      }),
    );
    const cached = _serverCache.get(cacheKey);
    if (cached) {
      return {
        result: resultFromCachedPrograms(cached, input.filters),
        confidence: deriveConfidence(cached.programs),
      };
    }

    const [allRows, registry] = await Promise.all([
      getPredictorIndexFromDeps(deps),
      loadRegistryMaps(),
    ]);
    // filter to IIT rows in JS — shared loader returns all instype values
    const iitRows = allRows.filter((row) => row.instype === "IIT");
    const enrichedRows = enrichRows(iitRows, registry);

    let result = predictPrograms({
      indexRows: enrichedRows,
      studentRank: input.rank,
      seatType: input.seat_type,
      quota: JEE_ADVANCED_QUOTA,
      gender: input.gender,
      includeAll: input.include_all,
      filters: input.filters,
    });
    result = finalizePredictionResult(
      result,
      input.filters,
      registry.instituteNirf,
    );

    if (input.has_ews_certificate) {
      const baseResult: CollegePredictionResult = {
        programs: result.programs,
        metadata: result.metadata,
        grouped_by_band: result.grouped_by_band,
      };
      let ews = predictPrograms({
        indexRows: enrichedRows,
        studentRank: input.rank,
        seatType: EWS_SEAT_TYPE,
        quota: JEE_ADVANCED_QUOTA,
        gender: input.gender,
        includeAll: input.include_all,
        filters: input.filters,
      });
      ews = finalizePredictionResult(
        ews,
        input.filters,
        registry.instituteNirf,
      );
      result.ews_comparison = {
        base: baseResult,
        ews,
        caveat: EWS_CAVEAT,
      };
    }

    const confidence = deriveConfidence(result.programs);

    _serverCache.set(cacheKey, {
      programs: result.programs,
      ews_comparison: result.ews_comparison,
    });
    return { result, confidence };
  },
};
