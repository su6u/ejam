#!/usr/bin/env tsx
/**
 * backtest jam-josaa-v2 and jam-csab-v2 on 2025 holdout — exits 1 if w20 < 30%
 **/

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { computeProbability } from "../../packages/data/src/college-predictor/engine";
import {
  JAM_TUNED,
  JAM_JOSAA_V2,
  resolvePoolShiftPct,
  roundWeightCaseSql,
  yearWeightsCaseSql,
} from "../jam/config";
import { CSAB_TUNED, JAM_CSAB_V2, csabEnsemblePredictedRankSql } from "../jam/csab-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_FILE = path.join(ROOT, "data", "dist", "backtest-results.json");

interface TrainingRow {
  institute_id: string;
  program_id: string;
  seat_type: string;
  quota: string;
  gender: string;
  predicted_closing_rank: number;
  sigma_effective: number;
}

interface HoldoutRow {
  institute_id: string;
  program_id: string;
  seat_type: string;
  quota: string;
  gender: string;
  closing_rank: number;
}

interface BacktestResult {
  train_years: number[];
  holdout_year: number;
  programs_matched: number;
  mae_ranks: number;
  median_ae_ranks: number;
  band_accuracy: number;
  within_10pct: number;
  within_20pct: number;
  // for each band: fraction where model direction is correct
  // safe/target → predicted >= actual; reach/long-shot → predicted < actual
  band_calibration: Record<
    string,
    { predicted_admission_rate: number; count: number }
  >;
}

/**
 * jam-josaa-v2 training SQL for JoSAA — mirrors build-college-predictor-index.ts
 */
function buildJoSAATrainingSQL(
  globPattern: string,
  holdoutYear: number,
  poolShiftPct: number,
): string {
  const roundW = roundWeightCaseSql();
  const {
    outlierGuardMultiplier,
    trendGapMultiplier,
    sigmaFloorPct,
    windowSize,
    sparseYearsThreshold,
    sigmaInflation,
    trendCapPct,
  } = JAM_TUNED;
  const yearWeightCase = yearWeightsCaseSql();
  const trainMaxYear = holdoutYear - 1;

  return `
CREATE OR REPLACE TEMP TABLE raw_cutoffs AS
SELECT * FROM read_parquet('${globPattern}') WHERE year <= ${trainMaxYear};

CREATE OR REPLACE TEMP TABLE normalized AS
SELECT institute_id, program_id, seat_type, quota, gender,
  CASE WHEN instype = '3IT' THEN 'IIIT' ELSE instype END AS instype,
  degree, duration_years, year, LEAST(round, 6) AS round, closing_rank
FROM raw_cutoffs;

CREATE OR REPLACE TEMP TABLE deduped AS
SELECT institute_id, program_id, seat_type, quota, gender, instype,
  degree, duration_years, year, round, MAX(closing_rank) AS closing_rank
FROM normalized
GROUP BY institute_id, program_id, seat_type, quota, gender, instype,
         degree, duration_years, year, round;

CREATE OR REPLACE TEMP TABLE anchor_round AS
SELECT institute_id, program_id, seat_type, quota, gender, year,
  ROUND(SUM(closing_rank * ${roundW}) / SUM(${roundW}))::INTEGER AS closing_rank
FROM deduped
GROUP BY institute_id, program_id, seat_type, quota, gender, year;

CREATE OR REPLACE TEMP TABLE year_weights AS
WITH windowed AS (
  SELECT institute_id, program_id, seat_type, quota, gender, year, closing_rank,
    ROW_NUMBER() OVER (
      PARTITION BY institute_id, program_id, seat_type, quota, gender
      ORDER BY year DESC
    ) AS yr
  FROM anchor_round QUALIFY yr <= ${windowSize}
),
group_std AS (
  SELECT institute_id, program_id, seat_type, quota, gender,
    STDDEV_POP(closing_rank) AS inter_year_std
  FROM windowed GROUP BY institute_id, program_id, seat_type, quota, gender
),
median_others AS (
  SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year,
    MEDIAN(b.closing_rank) AS med_others
  FROM windowed a JOIN windowed b
    ON a.institute_id = b.institute_id AND a.program_id = b.program_id
    AND a.seat_type = b.seat_type AND a.quota = b.quota AND a.gender = b.gender
    AND a.year != b.year
  GROUP BY a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year
)
SELECT w.institute_id, w.program_id, w.seat_type, w.quota, w.gender, w.year, w.yr,
  CASE
    WHEN gs.inter_year_std IS NOT NULL AND gs.inter_year_std > 0
      AND mo.med_others IS NOT NULL
      AND ABS(w.closing_rank - mo.med_others) > ${outlierGuardMultiplier} * gs.inter_year_std
    THEN 0.01
    ELSE CASE w.yr ${yearWeightCase} END
  END AS w
FROM windowed w
LEFT JOIN group_std gs USING (institute_id, program_id, seat_type, quota, gender)
LEFT JOIN median_others mo USING (institute_id, program_id, seat_type, quota, gender, year);

CREATE OR REPLACE TEMP TABLE weighted AS
SELECT ar.institute_id, ar.program_id, ar.seat_type, ar.quota, ar.gender,
  ar.year, ar.closing_rank, yw.w
FROM anchor_round ar JOIN year_weights yw
  ON ar.institute_id = yw.institute_id AND ar.program_id = yw.program_id
  AND ar.seat_type = yw.seat_type AND ar.quota = yw.quota AND ar.gender = yw.gender
  AND ar.year = yw.year;

CREATE OR REPLACE TEMP TABLE wmean AS
SELECT institute_id, program_id, seat_type, quota, gender,
  SUM(closing_rank * w) / SUM(w) AS wm
FROM weighted GROUP BY institute_id, program_id, seat_type, quota, gender;

CREATE OR REPLACE TEMP TABLE stats AS
SELECT d.institute_id, d.program_id, d.seat_type, d.quota, d.gender,
  ROUND(ANY_VALUE(m.wm))::INTEGER AS weighted_mean,
  ROUND(SQRT(SUM(d.w * POWER(d.closing_rank - m.wm, 2)) / SUM(d.w)))::INTEGER AS weighted_std,
  CASE
    WHEN (SUM(d.w * d.year * d.year) - POWER(SUM(d.w * d.year), 2) / SUM(d.w)) = 0 THEN 0
    ELSE ROUND(
      (SUM(d.w * d.year * d.closing_rank) - SUM(d.w * d.year) * SUM(d.w * d.closing_rank) / SUM(d.w))
      / (SUM(d.w * d.year * d.year) - POWER(SUM(d.w * d.year), 2) / SUM(d.w))
    )::INTEGER
  END AS trend_slope,
  COUNT(*)::INTEGER AS years_of_data,
  MAX(d.year)::INTEGER AS last_data_year
FROM weighted d JOIN wmean m
  ON d.institute_id = m.institute_id AND d.program_id = m.program_id
  AND d.seat_type = m.seat_type AND d.quota = m.quota AND d.gender = m.gender
GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender;

SELECT
  s.institute_id, s.program_id, s.seat_type, s.quota, s.gender,
  CASE
    WHEN s.years_of_data < ${sparseYearsThreshold}
      THEN ROUND(GREATEST(s.weighted_std, s.weighted_mean * ${sigmaFloorPct}) * ${sigmaInflation})::INTEGER
    ELSE GREATEST(s.weighted_std, ROUND(s.weighted_mean * ${sigmaFloorPct}))::INTEGER
  END AS sigma_effective,
  ROUND(
    (
      s.weighted_mean
      + GREATEST(
          LEAST(COALESCE(s.trend_slope, 0), s.weighted_mean * ${trendCapPct}),
          -s.weighted_mean * ${trendCapPct}
        ) * ${trendGapMultiplier} * (${holdoutYear} - s.last_data_year)
    ) * POWER(1 + ${poolShiftPct}, ${holdoutYear} - s.last_data_year)
  )::INTEGER AS predicted_closing_rank
FROM stats s
ORDER BY s.institute_id, s.program_id, s.seat_type, s.quota, s.gender;
  `;
}

/**
 * CSAB training SQL — mirrors build-csab-predictor-index.ts (jam-csab-v2)
 */
function buildCSABTrainingSQL(
  globPattern: string,
  holdoutYear: number,
): string {
  const {
    windowSize,
    yearWeights,
    outlierGuardMultiplier,
    sigmaFloorPct,
    sigmaInflation,
    sparseYearsThreshold,
  } = CSAB_TUNED;
  const weightCase = yearWeights
    .map((wt, i) => `WHEN ${i + 1} THEN ${wt}`)
    .join(" ");
  const trainMaxYear = holdoutYear - 1;
  const predictedRank = csabEnsemblePredictedRankSql(holdoutYear);

  return `
CREATE OR REPLACE TEMP TABLE raw_cutoffs AS
SELECT * FROM read_parquet('${globPattern}') WHERE year <= ${trainMaxYear};

CREATE OR REPLACE TEMP TABLE normalized AS
SELECT institute_id, program_id, seat_type, quota, gender,
  CASE WHEN instype = '3IT' THEN 'IIIT' ELSE instype END AS instype,
  degree, duration_years, year, LEAST(round, 6) AS round, closing_rank
FROM raw_cutoffs;

CREATE OR REPLACE TEMP TABLE deduped AS
SELECT institute_id, program_id, seat_type, quota, gender, instype,
  degree, duration_years, year, round, MAX(closing_rank) AS closing_rank
FROM normalized
GROUP BY institute_id, program_id, seat_type, quota, gender, instype,
         degree, duration_years, year, round;

CREATE OR REPLACE TEMP TABLE last_round AS
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY institute_id, program_id, seat_type, quota, gender, year
    ORDER BY round DESC
  ) AS rn FROM deduped
) SELECT * FROM ranked WHERE rn = 1;

CREATE OR REPLACE TEMP TABLE year_weights AS
WITH windowed AS (
  SELECT institute_id, program_id, seat_type, quota, gender, year, closing_rank,
    ROW_NUMBER() OVER (
      PARTITION BY institute_id, program_id, seat_type, quota, gender
      ORDER BY year DESC
    ) AS yr
  FROM last_round QUALIFY yr <= ${windowSize}
),
group_std AS (
  SELECT institute_id, program_id, seat_type, quota, gender,
    STDDEV_POP(closing_rank) AS inter_year_std
  FROM windowed GROUP BY institute_id, program_id, seat_type, quota, gender
),
median_others AS (
  SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year,
    MEDIAN(b.closing_rank) AS med_others
  FROM windowed a JOIN windowed b
    ON a.institute_id = b.institute_id AND a.program_id = b.program_id
    AND a.seat_type = b.seat_type AND a.quota = b.quota AND a.gender = b.gender
    AND a.year != b.year
  GROUP BY a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year
)
SELECT w.institute_id, w.program_id, w.seat_type, w.quota, w.gender, w.year, w.yr,
  CASE
    WHEN gs.inter_year_std IS NOT NULL AND gs.inter_year_std > 0
      AND mo.med_others IS NOT NULL
      AND ABS(w.closing_rank - mo.med_others) > ${outlierGuardMultiplier} * gs.inter_year_std
    -- COVID outlier guard: collapse anomalous years to near-zero weight
    THEN 0.01
    ELSE CASE w.yr ${weightCase} END
  END AS w
FROM windowed w
LEFT JOIN group_std gs USING (institute_id, program_id, seat_type, quota, gender)
LEFT JOIN median_others mo USING (institute_id, program_id, seat_type, quota, gender, year);

CREATE OR REPLACE TEMP TABLE weighted AS
SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender,
  lr.instype, lr.year, lr.closing_rank, yw.w
FROM last_round lr JOIN year_weights yw
  ON lr.institute_id = yw.institute_id AND lr.program_id = yw.program_id
  AND lr.seat_type = yw.seat_type AND lr.quota = yw.quota AND lr.gender = yw.gender
  AND lr.year = yw.year;

CREATE OR REPLACE TEMP TABLE wmean AS
SELECT institute_id, program_id, seat_type, quota, gender,
  SUM(closing_rank * w) / SUM(w) AS wm,
  MEDIAN(closing_rank) AS mm
FROM weighted GROUP BY institute_id, program_id, seat_type, quota, gender;

CREATE OR REPLACE TEMP TABLE stats AS
SELECT d.institute_id, d.program_id, d.seat_type, d.quota, d.gender,
  ANY_VALUE(d.instype) AS instype,
  ROUND(ANY_VALUE(m.wm))::INTEGER AS weighted_mean,
  ROUND(ANY_VALUE(m.mm))::INTEGER AS median_mean,
  ROUND(SQRT(SUM(d.w * POWER(d.closing_rank - m.wm, 2)) / SUM(d.w)))::INTEGER AS weighted_std,
  CASE
    WHEN (SUM(d.w * d.year * d.year) - POWER(SUM(d.w * d.year), 2) / SUM(d.w)) = 0 THEN 0
    ELSE ROUND(
      (SUM(d.w * d.year * d.closing_rank) - SUM(d.w * d.year) * SUM(d.w * d.closing_rank) / SUM(d.w))
      / (SUM(d.w * d.year * d.year) - POWER(SUM(d.w * d.year), 2) / SUM(d.w))
    )::INTEGER
  END AS trend_slope,
  COUNT(*)::INTEGER AS years_of_data,
  MAX(d.year)::INTEGER AS last_data_year
FROM weighted d JOIN wmean m
  ON d.institute_id = m.institute_id AND d.program_id = m.program_id
  AND d.seat_type = m.seat_type AND d.quota = m.quota AND d.gender = m.gender
GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender;

SELECT
  s.institute_id, s.program_id, s.seat_type, s.quota, s.gender,
  CASE
    WHEN s.years_of_data < ${sparseYearsThreshold}
      THEN ROUND(GREATEST(s.weighted_std, s.weighted_mean * ${sigmaFloorPct}) * ${sigmaInflation})::INTEGER
    ELSE GREATEST(s.weighted_std, ROUND(s.weighted_mean * ${sigmaFloorPct}))::INTEGER
  END AS sigma_effective,
  ${predictedRank}::INTEGER AS predicted_closing_rank
FROM stats s
ORDER BY s.institute_id, s.program_id, s.seat_type, s.quota, s.gender;
  `;
}

function buildHoldoutSQL(globPattern: string): string {
  // mirror training dedup — multiple degree/duration rows can share the same seat key at final round
  return `
WITH all_2025 AS (
  SELECT institute_id, program_id, seat_type, quota, gender,
    CASE WHEN instype = '3IT' THEN 'IIIT' ELSE instype END AS instype,
    degree, duration_years, year, LEAST(round, 6) AS round, closing_rank
  FROM read_parquet('${globPattern}') WHERE year = 2025
),
deduped AS (
  SELECT institute_id, program_id, seat_type, quota, gender, instype,
    degree, duration_years, year, round, MAX(closing_rank) AS closing_rank
  FROM all_2025
  GROUP BY institute_id, program_id, seat_type, quota, gender, instype,
           degree, duration_years, year, round
),
max_rounds AS (
  SELECT institute_id, program_id, seat_type, quota, gender, MAX(round) AS max_round
  FROM deduped
  GROUP BY institute_id, program_id, seat_type, quota, gender
),
final_round AS (
  SELECT d.institute_id, d.program_id, d.seat_type, d.quota, d.gender, d.closing_rank
  FROM deduped d
  JOIN max_rounds mr
    ON d.institute_id = mr.institute_id AND d.program_id = mr.program_id
    AND d.seat_type = mr.seat_type AND d.quota = mr.quota AND d.gender = mr.gender
    AND d.round = mr.max_round
)
SELECT institute_id, program_id, seat_type, quota, gender,
  MAX(closing_rank)::INTEGER AS closing_rank
FROM final_round
GROUP BY institute_id, program_id, seat_type, quota, gender;
  `;
}

type DuckConn = {
  runAndReadAll: (
    sql: string,
  ) => Promise<{ getRowObjectsJS: () => Record<string, unknown>[] }>;
};

async function loadJoSAATraining(
  conn: DuckConn,
  glob: string,
  holdoutYear: number,
): Promise<Map<string, TrainingRow>> {
  const poolShiftPct = resolvePoolShiftPct();
  const reader = await conn.runAndReadAll(
    buildJoSAATrainingSQL(glob, holdoutYear, poolShiftPct),
  );
  const idx = new Map<string, TrainingRow>();
  for (const r of reader.getRowObjectsJS()) {
    const key = `${r.institute_id}|${r.program_id}|${r.seat_type}|${r.quota}|${r.gender}`;
    idx.set(key, {
      institute_id: String(r.institute_id),
      program_id: String(r.program_id),
      seat_type: String(r.seat_type),
      quota: String(r.quota),
      gender: String(r.gender),
      predicted_closing_rank: Number(r.predicted_closing_rank),
      sigma_effective: Number(r.sigma_effective),
    });
  }
  return idx;
}

async function loadCSABTraining(
  conn: DuckConn,
  glob: string,
  holdoutYear: number,
): Promise<Map<string, TrainingRow>> {
  const reader = await conn.runAndReadAll(
    buildCSABTrainingSQL(glob, holdoutYear),
  );
  const idx = new Map<string, TrainingRow>();
  for (const r of reader.getRowObjectsJS()) {
    const key = `${r.institute_id}|${r.program_id}|${r.seat_type}|${r.quota}|${r.gender}`;
    idx.set(key, {
      institute_id: String(r.institute_id),
      program_id: String(r.program_id),
      seat_type: String(r.seat_type),
      quota: String(r.quota),
      gender: String(r.gender),
      predicted_closing_rank: Number(r.predicted_closing_rank),
      sigma_effective: Number(r.sigma_effective),
    });
  }
  return idx;
}

async function loadHoldout(
  conn: DuckConn,
  glob: string,
): Promise<HoldoutRow[]> {
  const reader = await conn.runAndReadAll(buildHoldoutSQL(glob));
  return reader.getRowObjectsJS().map((r) => ({
    institute_id: String(r.institute_id),
    program_id: String(r.program_id),
    seat_type: String(r.seat_type),
    quota: String(r.quota),
    gender: String(r.gender),
    closing_rank: Number(r.closing_rank),
  }));
}

function computeMetrics(
  trainingIndex: Map<string, TrainingRow>,
  holdout: HoldoutRow[],
): Omit<BacktestResult, "train_years" | "holdout_year"> {
  const matched: Array<{ t: TrainingRow; actual: number }> = [];
  for (const h of holdout) {
    const t = trainingIndex.get(
      `${h.institute_id}|${h.program_id}|${h.seat_type}|${h.quota}|${h.gender}`,
    );
    if (t) matched.push({ t, actual: h.closing_rank });
  }

  if (matched.length === 0) {
    return {
      programs_matched: 0,
      mae_ranks: 0,
      median_ae_ranks: 0,
      band_accuracy: 0,
      within_10pct: 0,
      within_20pct: 0,
      band_calibration: {},
    };
  }

  const absErrors: number[] = [];
  let bandHits = 0,
    within10 = 0,
    within20 = 0;
  const bands: Record<string, { correct: number; count: number }> = {
    safe: { correct: 0, count: 0 },
    target: { correct: 0, count: 0 },
    reach: { correct: 0, count: 0 },
    "long-shot": { correct: 0, count: 0 },
  };

  for (const { t, actual } of matched) {
    const err = Math.abs(t.predicted_closing_rank - actual);
    absErrors.push(err);
    const pct = err / actual;
    if (pct <= 0.1) within10++;
    if (pct <= 0.2) within20++;

    // classify the band a student at the actual closing rank would receive
    const prob = computeProbability(
      actual,
      t.predicted_closing_rank,
      t.sigma_effective,
    );
    const band =
      prob >= 0.85
        ? "safe"
        : prob >= 0.4
          ? "target"
          : prob >= 0.1
            ? "reach"
            : "long-shot";

    // boundary students should land in safe or target — both are directionally correct
    if (band === "safe" || band === "target") bandHits++;

    if (bands[band]) {
      bands[band].count++;
      // direction correct: safe/target → model predicted rank ≥ actual (optimistic)
      //                    reach/long-shot → model predicted rank < actual (pessimistic)
      const optimistic = t.predicted_closing_rank >= actual;
      if ((band === "safe" || band === "target") && optimistic)
        bands[band].correct++;
      else if ((band === "reach" || band === "long-shot") && !optimistic)
        bands[band].correct++;
    }
  }

  absErrors.sort((a, b) => a - b);
  const mae = absErrors.reduce((s, e) => s + e, 0) / absErrors.length;
  const median = absErrors[Math.floor(absErrors.length / 2)] ?? 0;

  const band_calibration: Record<
    string,
    { predicted_admission_rate: number; count: number }
  > = {};
  for (const [band, b] of Object.entries(bands)) {
    band_calibration[band] = {
      predicted_admission_rate: b.count > 0 ? b.correct / b.count : 0,
      count: b.count,
    };
  }

  return {
    programs_matched: matched.length,
    mae_ranks: Math.round(mae),
    median_ae_ranks: Math.round(median),
    band_accuracy: bandHits / matched.length,
    within_10pct: within10 / matched.length,
    within_20pct: within20 / matched.length,
    band_calibration,
  };
}

async function runJoSAABacktest(
  conn: DuckConn,
  cutoffsGlob: string,
): Promise<BacktestResult> {
  const holdoutYear = 2025;
  const poolShiftPct = resolvePoolShiftPct();
  console.log(`\n[JoSAA/${JAM_JOSAA_V2}] pool_shift=${(poolShiftPct * 100).toFixed(2)}%`);
  console.log(`[JoSAA/${JAM_JOSAA_V2}] Loading training data (2021–2024)...`);
  const trainingIndex = await loadJoSAATraining(conn, cutoffsGlob, holdoutYear);
  console.log(`[JoSAA/${JAM_JOSAA_V2}] Training index: ${trainingIndex.size} rows`);

  console.log(`[JoSAA/${JAM_JOSAA_V2}] Loading 2025 holdout...`);
  const holdout = await loadHoldout(conn, cutoffsGlob);
  console.log(`[JoSAA/${JAM_JOSAA_V2}] Holdout: ${holdout.length} rows`);

  console.log(`[JoSAA/${JAM_JOSAA_V2}] Computing metrics...`);
  return {
    train_years: [2021, 2022, 2023, 2024],
    holdout_year: holdoutYear,
    ...computeMetrics(trainingIndex, holdout),
  };
}

async function runCSABBacktest(
  conn: DuckConn,
  cutoffsGlob: string,
): Promise<BacktestResult> {
  const holdoutYear = 2025;
  console.log(`\n[CSAB/${JAM_CSAB_V2}] Loading training data (2021–2024)...`);
  const trainingIndex = await loadCSABTraining(conn, cutoffsGlob, holdoutYear);
  console.log(`[CSAB/${JAM_CSAB_V2}] Training index: ${trainingIndex.size} rows`);

  console.log(`[CSAB/${JAM_CSAB_V2}] Loading 2025 holdout...`);
  const holdout = await loadHoldout(conn, cutoffsGlob);
  console.log(`[CSAB/${JAM_CSAB_V2}] Holdout: ${holdout.length} rows`);

  console.log(`[CSAB/${JAM_CSAB_V2}] Computing metrics...`);
  return {
    train_years: [2021, 2022, 2023, 2024],
    holdout_year: holdoutYear,
    ...computeMetrics(trainingIndex, holdout),
  };
}

function printSummary(label: string, r: BacktestResult): void {
  console.log(
    `\n=== ${label} (train: ${r.train_years.join(",")}  holdout: ${r.holdout_year}) ===`,
  );
  console.log(`Programs matched:  ${r.programs_matched}`);
  console.log(`Within 10%:        ${(r.within_10pct * 100).toFixed(1)}%`);
  console.log(`Within 20%:        ${(r.within_20pct * 100).toFixed(1)}%`);
  console.log(`Median AE (ranks): ${r.median_ae_ranks}`);
  console.log(`MAE (ranks):       ${r.mae_ranks}`);
  console.log(
    `Band accuracy:     ${(r.band_accuracy * 100).toFixed(1)}%  (safe/target at actual boundary)`,
  );
  console.log("\nBand direction accuracy:");
  for (const [band, b] of Object.entries(r.band_calibration)) {
    console.log(
      `  ${band.padEnd(10)}: ${(b.predicted_admission_rate * 100).toFixed(1)}%  (n=${b.count})`,
    );
  }
}

async function main(): Promise<void> {
  const josaaGlob = path.join(
    ROOT,
    "data/engineering/jee/josaa/cutoffs/year=*/round=*/cutoffs.parquet",
  );
  const csabGlob = path.join(
    ROOT,
    "data/engineering/jee/csab/cutoffs/year=*/round=*/cutoffs.parquet",
  );

  // @duckdb/node-api lives in packages/data/node_modules; tsx resolves it at runtime
  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create(":memory:");
  const conn = await instance.connect();

  const josaa = await runJoSAABacktest(conn, josaaGlob);
  const csab = await runCSABBacktest(conn, csabGlob);

  conn.closeSync();
  instance.closeSync();

  printSummary(`JoSAA/${JAM_JOSAA_V2}`, josaa);
  printSummary(`CSAB/${JAM_CSAB_V2}`, csab);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      { generated_at: new Date().toISOString(), josaa, csab },
      null,
      2,
    ),
  );
  console.log(`\nResults written to ${OUTPUT_FILE}`);

  if (josaa.within_20pct < 0.3 || csab.within_20pct < 0.3) {
    const worst = Math.min(josaa.within_20pct, csab.within_20pct);
    console.error(
      `\nFAIL: within-20% ${(worst * 100).toFixed(1)}% is below the 30% hard threshold`,
    );
    process.exit(1);
  }
  console.log("\nPASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
