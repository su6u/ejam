/**
 * JEE Main college predictor — NIT/IIIT/GFTI with HS/OS quota resolution
 * loads college_predictor_index.parquet via @duckdb/node-api
 */

import type { ExamPredictor } from "@ejam/data";
import {
  type CollegePredictionResult,
  type CollegePredictorFilters,
  type CollegePredictorIndexRow,
  type ProgramPrediction,
  predictPrograms,
  readPredictionResultCache,
  writePredictionResultCache,
} from "@ejam/data/college-predictor";
import { z } from "zod";

const JeeMainInput = z.object({
  rank: z.number().int().min(1).max(500000),
  seat_type: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  gender: z.string().regex(/^[A-Za-z0-9 ()-]+$/),
  state: z.string().optional().default(""),
  filters: z
    .object({
      institute_type: z.array(z.string()).optional(),
      state: z.array(z.string()).optional(),
      branch_name: z.union([z.string(), z.array(z.string())]).optional(),
      band: z.array(z.enum(["safe", "target", "reach", "long-shot"])).optional(),
    })
    .optional(),
  ews_toggle: z.boolean().optional(),
  include_all: z.boolean().optional(),
});
type JeeMainInput = z.infer<typeof JeeMainInput>;

const SPECIAL_STATE_QUOTAS: Record<string, string> = {
  GO: "Goa",
  JK: "Jammu and Kashmir",
  LA: "Ladakh",
  AP: "Andhra Pradesh",
};
const EWS_SEAT_TYPE = "Gen-EWS";

type RegistryMaps = {
  instituteStates: Map<string, string>;
  programNames: Map<string, string>;
};

let _cachedIndex: CollegePredictorIndexRow[] | null = null;
let _cachedRegistry: RegistryMaps | null = null;

async function loadIndex(): Promise<CollegePredictorIndexRow[]> {
  if (_cachedIndex) return _cachedIndex;

  const { join, resolve } = await import("node:path");
  const indexPath = resolve(
    process.env.EJAM_DIST_DATA_ROOT ?? join(process.cwd(), "data", "dist"),
    "college_predictor_index.parquet",
  );

  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  const result = await connection.run(
    `SELECT * FROM read_parquet('${indexPath}') WHERE instype != 'IIT'`,
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

export const predictor: ExamPredictor<JeeMainInput, CollegePredictionResult> = {
  inputSchema: JeeMainInput,

  async predict(input, _deps) {
    const cacheInput = { exam_id: _deps.examId, ...input };
    const cachedPrograms = readPredictionResultCache<ProgramPrediction>(cacheInput);
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

    const [allRows, registry] = await Promise.all([loadIndex(), loadRegistryMaps()]);
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

    if (input.ews_toggle) {
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
      };
    }

    const confidence = result.metadata.total_above_threshold > 0
      ? { level: "medium" as const, caveat: "probabilities are based on historical closing rank trends" }
      : { level: "low" as const, caveat: "no programs found above the probability threshold for this rank" };

    writePredictionResultCache(cacheInput, result.programs);
    return { result, confidence };
  },
};
