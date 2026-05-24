/**
 * JEE Main college predictor — NIT/IIIT/CFI with HS/OS/special-state quota resolution
 * uses the shared JoSAA index loader; filters to non-IIT rows in JS after load
 * quota filtering happens in JS after loading the shared index; state must be a canonical
 * value from institutes.json — validated at the Zod schema layer before predict() is called
 */

import type { ExamPredictor } from "@ejam/data";
import {
  type CollegePredictionResult,
  type CollegePredictorFilters,
  type CollegePredictorIndexRow,
  deriveConfidence,
  getJosaaIndex,
  loadCanonicalStates,
  type ProgramPrediction,
  predictPrograms,
} from "@ejam/data/college-predictor";
import { z } from "zod";
import {
  finalizePredictionResult,
  resultFromRankedPrograms,
} from "@/predictors/shared/finalize-prediction";

const JeeMainInput = z.object({
  rank: z.number().int().min(1).max(500000),
  seat_type: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  gender: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  state: z
    .string()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || loadCanonicalStates().has(value),
      "state must be a canonical value from the institute registry",
    ),
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
type JeeMainInput = z.infer<typeof JeeMainInput>;

// values must match the corresponding state strings in data/registry/engineering/institutes.json
// exactly — HS/OS/special-state quota matching does string equality on row.state
// Ladakh has no institutes in the registry today; keep the entry so a future
// Ladakh institute (e.g. an upcoming NIT/IIIT) is recognised the moment its row is added
const SPECIAL_STATE_QUOTAS: Record<string, string> = {
  GO: "Goa",
  JK: "Jammu and Kashmir",
  LA: "Ladakh",
  AP: "Andhra Pradesh",
};
const EWS_SEAT_TYPE = "Gen-EWS";
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
  const registryRoot =
    process.env.EJAM_REGISTRY_ROOT ?? join(process.cwd(), "data", "registry");
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

function filterByQuota(
  rows: CollegePredictorIndexRow[],
  studentState: string,
  instituteStates: Map<string, string>,
): CollegePredictorIndexRow[] {
  return rows.filter((row) => {
    const q = row.quota;
    if (q === "AI") return true;
    if (q === "HS")
      return instituteStates.get(row.institute_id) === studentState;
    if (q === "OS")
      return instituteStates.get(row.institute_id) !== studentState;
    const specialState = SPECIAL_STATE_QUOTAS[q];
    if (specialState) return studentState === specialState;
    return false;
  });
}

function resultFromCachedPrograms(
  cachedPrograms: ProgramPrediction[],
  filters: CollegePredictorFilters | undefined,
): CollegePredictionResult {
  return resultFromRankedPrograms(cachedPrograms, filters);
}

export const predictor: ExamPredictor<JeeMainInput, CollegePredictionResult> = {
  inputSchema: JeeMainInput,

  async predict(input, _deps) {
    const cacheInput = { exam_id: _deps.examId, ...input };
    const cacheKey = fnv1a(stableStringify(cacheInput));
    const cachedPrograms = _serverCache.get(cacheKey);
    if (cachedPrograms) {
      return {
        result: resultFromCachedPrograms(cachedPrograms, input.filters),
        confidence: deriveConfidence(cachedPrograms),
      };
    }

    const [allRows, registry] = await Promise.all([
      getJosaaIndex(),
      loadRegistryMaps(),
    ]);
    // filter to non-IIT rows in JS — shared loader returns all instype values
    const nonIitRows = allRows.filter((row) => row.instype !== "IIT");
    const enrichedRows = enrichRows(nonIitRows, registry);
    const quotaFiltered = filterByQuota(
      enrichedRows,
      input.state,
      registry.instituteStates,
    );

    let result = predictPrograms({
      indexRows: quotaFiltered,
      studentRank: input.rank,
      seatType: input.seat_type,
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
        best_picks: result.best_picks,
        stretch_picks: result.stretch_picks,
      };
      let ews = predictPrograms({
        indexRows: quotaFiltered,
        studentRank: input.rank,
        seatType: EWS_SEAT_TYPE,
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

    _serverCache.set(cacheKey, result.programs);
    return { result, confidence };
  },
};
