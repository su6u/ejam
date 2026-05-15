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
  loadCanonicalStates,
  type ProgramPrediction,
  predictPrograms,
} from "@ejam/data/college-predictor";
import { z } from "zod";

const CsabInput = z.object({
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
      band: z.array(z.enum(["safe", "target", "reach", "long-shot"])).optional(),
    })
    .optional(),
  has_ews_certificate: z.boolean().optional(),
  include_all: z.boolean().optional(),
});
type CsabInput = z.infer<typeof CsabInput>;

// values must match the corresponding state strings in data/registry/engineering/institutes.json
// exactly — HS/OS/special-state quota matching does string equality on row.state
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
};

// module-level caches — populated on first request, cleared on process restart
let _cachedIndex: CollegePredictorIndexRow[] | null = null;
let _cachedRegistry: RegistryMaps | null = null;

// in-memory prediction result cache — keyed by FNV1a hash of canonical input
// avoids re-running the probability computation for identical requests
const _resultCache = new Map<string, ProgramPrediction[]>();

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function cacheKey(input: unknown): string {
  return fnv1a(JSON.stringify(input));
}

async function loadIndex(): Promise<CollegePredictorIndexRow[]> {
  if (_cachedIndex) return _cachedIndex;

  const { join, resolve } = await import("node:path");
  const indexPath = resolve(
    process.env.EJAM_DIST_DATA_ROOT ?? join(process.cwd(), "data", "dist"),
    "csab_predictor_index.parquet",
  );

  // graceful degradation: if the CSAB index hasn't been built yet, return empty
  const { existsSync } = await import("node:fs");
  if (!existsSync(indexPath)) {
    _cachedIndex = [];
    return _cachedIndex;
  }

  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  const result = await connection.run(
    `SELECT * FROM read_parquet('${indexPath}')`,
  );
  const rows = await result.fetchAllRows();
  await connection.close();
  await instance.close();

  _cachedIndex = rows as unknown as CollegePredictorIndexRow[];
  return _cachedIndex;
}

async function loadRegistryMaps(): Promise<RegistryMaps> {
  if (_cachedRegistry) return _cachedRegistry;

  const { readFileSync } = await import("node:fs");
  const { join, resolve } = await import("node:path");
  const registryRoot =
    process.env.EJAM_REGISTRY_ROOT ?? join(process.cwd(), "data", "registry");
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
    if (q === "HS") return instituteStates.get(row.institute_id) === studentState;
    if (q === "OS") return instituteStates.get(row.institute_id) !== studentState;
    const specialState = SPECIAL_STATE_QUOTAS[q];
    if (specialState) return studentState === specialState;
    return false;
  });
}

function deriveConfidence(
  programs: ProgramPrediction[],
): { level: "high" | "medium" | "low"; caveat: string } {
  if (programs.length === 0) {
    return { level: "low", caveat: "no programs found above the probability threshold for this rank" };
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

export const predictor: ExamPredictor<CsabInput, CollegePredictionResult> = {
  inputSchema: CsabInput,

  async predict(input, deps) {
    const key = cacheKey({ exam_id: deps.examId, ...input });
    const cached = _resultCache.get(key);
    if (cached) {
      return {
        result: resultFromCachedPrograms(cached, input.filters),
        confidence: deriveConfidence(cached),
      };
    }

    const [allRows, registry] = await Promise.all([loadIndex(), loadRegistryMaps()]);

    // graceful degradation: CSAB index not built yet
    if (allRows.length === 0) {
      return {
        result: resultFromCachedPrograms([], input.filters),
        confidence: { level: "low", caveat: "CSAB index is not yet available" },
      };
    }

    const enrichedRows = enrichRows(allRows, registry);
    const quotaFiltered = filterByQuota(enrichedRows, input.state, registry.instituteStates);

    const result = predictPrograms({
      indexRows: quotaFiltered,
      studentRank: input.rank,
      seatType: input.seat_type,
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
          indexRows: quotaFiltered,
          studentRank: input.rank,
          seatType: EWS_SEAT_TYPE,
          gender: input.gender,
          includeAll: input.include_all,
          filters: input.filters,
        }),
        caveat: EWS_CAVEAT,
      };
    }

    _resultCache.set(key, result.programs);
    return { result, confidence: deriveConfidence(result.programs) };
  },
};
