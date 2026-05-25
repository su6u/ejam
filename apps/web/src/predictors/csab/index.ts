/**
 * CSAB college predictor — NIT/IIIT/CFI supplementary rounds
 * uses a separate index built from CSAB-only cutoff data so the candidate
 * pool (post-JoSAA students) is never blended with the JoSAA population
 *
 * quota resolution is identical to JEE Main: HS/OS/AI/special-state
 * state must be a canonical value from institutes.json — validated at the
 * Zod schema layer before predict() is called
 */

import type { ExamPredictor } from "@ejam/data";
import {
  type CollegePredictionResult,
  type CollegePredictorFilters,
  type CollegePredictorIndexRow,
  getPredictorIndexFromDeps,
  loadCanonicalStates,
  type ProgramPrediction,
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
import {
  QuotaApi,
  refineQuotaRequiresState,
} from "@/predictors/shared/quota-input";

const CsabInput = z
  .object({
  rank: z.number().int().min(1).max(500000),
  seat_type: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  gender: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  quota: QuotaApi.default("OS"),
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
})
  .superRefine(refineQuotaRequiresState);
type CsabInput = z.infer<typeof CsabInput>;

// values must match the corresponding state strings in data/registry/engineering/institutes.json
// exactly — HS/OS/special-state quota matching does string equality on row.state
const SPECIAL_STATE_QUOTAS: Record<string, string> = {
  GO: "Goa",
  JK: "Jammu and Kashmir",
  LA: "Ladakh",
  AP: "Andhra Pradesh",
};

const EWS_SEAT_TYPE = "EWS";
const EWS_CAVEAT =
  "EWS seats are only available to candidates holding a valid EWS certificate issued by a competent authority. These results assume you are EWS-eligible.";

type RegistryMaps = {
  instituteStates: Map<string, string>;
  programNames: Map<string, string>;
  instituteNirf: Map<string, number | null | undefined>;
};

// module-level caches — populated on first request, cleared on process restart
let _cachedRegistry: RegistryMaps | null = null;

// in-memory prediction result cache — keyed by FNV1a hash of canonical input
// avoids re-running the probability computation for identical requests
const _resultCache = new Map<string, ServerCacheEntry>();

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

function cacheKey(input: unknown): string {
  return fnv1a(stableStringify(input));
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

function deriveConfidence(programs: ProgramPrediction[]): {
  level: "high" | "medium" | "low";
  caveat: string;
} {
  if (programs.length === 0) {
    return {
      level: "low",
      caveat: "no programs found above the probability threshold for this rank",
    };
  }
  // worst data_quality among returned programs drives the confidence level
  // high is reserved until backtesting proves calibration
  const hasPooled = programs.some((p) => p.data_quality === "pooled");
  const hasInferred = programs.some((p) => p.data_quality === "inferred");
  if (hasPooled || hasInferred) {
    return {
      level: "low",
      caveat: hasPooled
        ? "some programs are based on a single year of CSAB data — treat with caution"
        : "some programs are based on only 2 years of CSAB data — treat with caution",
    };
  }
  return {
    level: "medium",
    caveat: "probabilities are based on historical CSAB closing rank data",
  };
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

export const predictor: ExamPredictor<CsabInput, CollegePredictionResult> = {
  inputSchema: CsabInput,

  async predict(input, deps) {
    const key = cacheKey({
      index_sha: indexShaFromDeps(deps),
      exam_id: deps.examId,
      ...input,
    });
    const cached = _resultCache.get(key);
    if (cached) {
      return {
        result: resultFromCachedPrograms(cached, input.filters),
        confidence: deriveConfidence(cached.programs),
      };
    }

    const allRows = await getPredictorIndexFromDeps(deps);
    if (allRows.length === 0) {
      return {
        result: resultFromRankedPrograms([], input.filters),
        confidence: {
          level: "low",
          caveat: "CSAB predictor index is empty — rebuild csab_predictor_index.parquet",
        },
      };
    }

    const registry = await loadRegistryMaps();

    const enrichedRows = enrichRows(allRows, registry);
    const quotaFiltered = filterByQuota(
      enrichedRows,
      input.state,
      registry.instituteStates,
    );

    let result = predictPrograms({
      indexRows: quotaFiltered,
      studentRank: input.rank,
      seatType: input.seat_type,
      quota: input.quota,
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
        indexRows: quotaFiltered,
        studentRank: input.rank,
        seatType: EWS_SEAT_TYPE,
        quota: input.quota,
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

    _resultCache.set(key, {
      programs: result.programs,
      ews_comparison: result.ews_comparison,
    });
    return { result, confidence: deriveConfidence(result.programs) };
  },
};
