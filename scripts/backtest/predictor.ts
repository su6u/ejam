#!/usr/bin/env tsx
/**
 * measures prediction accuracy of the college predictor algorithm
 *
 * trains on JoSAA and CSAB cutoffs from 2021–2024, tests against 2025 actuals.
 * outputs results to data/dist/backtest-results.json and prints a summary.
 *
 * each authority uses independently tuned parameters:
 *   JoSAA — 4-year window, ±3% trend cap
 *   CSAB  — 2-year window, ±5% trend cap (early CSAB years are anomalous)
 *
 * exits with code 1 if within-20% accuracy falls below 30% — CI gate.
 **/

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { computeProbability } from "../../packages/data/src/college-predictor/engine";

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
 * builds the training SQL for a given cutoff glob
 * windowSize and trendCapPct are tuned per authority — see file docstring
 */
function buildTrainingSQL(
  globPattern: string,
  windowSize: number,
  trendCapPct: number,
): string {
  const weightsByWindow: Record<number, number[]> = {
    2: [0.65, 0.35],
    3: [0.55, 0.3, 0.15],
    4: [0.5, 0.3, 0.15, 0.05],
  };
  const w = weightsByWindow[windowSize] ?? weightsByWindow[4]!;
  const weightCase = w.map((wt, i) => `WHEN ${i + 1} THEN ${wt}`).join(" ");

  return `
CREATE OR REPLACE TEMP TABLE raw_cutoffs AS
SELECT * FROM read_parquet('${globPattern}') WHERE year <= 2024;

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
      AND ABS(w.closing_rank - mo.med_others) > 2 * gs.inter_year_std
    -- COVID outlier guard: collapse anomalous years to near-zero weight
    THEN 0.01
    ELSE CASE w.yr ${weightCase} END
  END AS w
FROM windowed w
LEFT JOIN group_std gs USING (institute_id, program_id, seat_type, quota, gender)
LEFT JOIN median_others mo USING (institute_id, program_id, seat_type, quota, gender, year);

CREATE OR REPLACE TEMP TABLE weighted AS
SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender,
  lr.year, lr.closing_rank, yw.w
FROM last_round lr JOIN year_weights yw
  ON lr.institute_id = yw.institute_id AND lr.program_id = yw.program_id
  AND lr.seat_type = yw.seat_type AND lr.quota = yw.quota AND lr.gender = yw.gender
  AND lr.year = yw.year;

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
    WHEN s.years_of_data < 3
      THEN ROUND(GREATEST(s.weighted_std, s.weighted_mean * 0.03) * 1.5)::INTEGER
    ELSE GREATEST(s.weighted_std, ROUND(s.weighted_mean * 0.03))::INTEGER
  END AS sigma_effective,
  ROUND(
    s.weighted_mean
    + GREATEST(
        LEAST(COALESCE(s.trend_slope, 0), s.weighted_mean * ${trendCapPct}),
        -s.weighted_mean * ${trendCapPct}
      ) * (2025 - s.last_data_year)
  )::INTEGER AS predicted_closing_rank
FROM stats s
ORDER BY s.institute_id, s.program_id, s.seat_type, s.quota, s.gender;
  `;
}

function buildHoldoutSQL(globPattern: string): string {
  return `
WITH all_2025 AS (
  SELECT * FROM read_parquet('${globPattern}') WHERE year = 2025
),
max_rounds AS (
  SELECT institute_id, program_id, seat_type, quota, gender, MAX(round) AS max_round
  FROM all_2025 GROUP BY institute_id, program_id, seat_type, quota, gender
)
SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.closing_rank
FROM all_2025 a JOIN max_rounds mr
  ON a.institute_id = mr.institute_id AND a.program_id = mr.program_id
  AND a.seat_type = mr.seat_type AND a.quota = mr.quota AND a.gender = mr.gender
  AND a.round = mr.max_round;
  `;
}

type DuckConn = {
  runAndReadAll: (
    sql: string,
  ) => Promise<{ getRowObjectsJS: () => Record<string, unknown>[] }>;
};

async function loadTraining(
  conn: DuckConn,
  glob: string,
  windowSize: number,
  trendCapPct: number,
): Promise<Map<string, TrainingRow>> {
  const reader = await conn.runAndReadAll(
    buildTrainingSQL(glob, windowSize, trendCapPct),
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

async function runBacktest(
  conn: DuckConn,
  label: string,
  cutoffsGlob: string,
  windowSize: number,
  trendCapPct: number,
): Promise<BacktestResult> {
  console.log(`\n[${label}] Loading training data (2021–2024)...`);
  const trainingIndex = await loadTraining(
    conn,
    cutoffsGlob,
    windowSize,
    trendCapPct,
  );
  console.log(`[${label}] Training index: ${trainingIndex.size} rows`);

  console.log(`[${label}] Loading 2025 holdout...`);
  const holdout = await loadHoldout(conn, cutoffsGlob);
  console.log(`[${label}] Holdout: ${holdout.length} rows`);

  console.log(`[${label}] Computing metrics...`);
  return {
    train_years: [2021, 2022, 2023, 2024],
    holdout_year: 2025,
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

  const josaa = await runBacktest(conn, "JoSAA", josaaGlob, 4, 0.03);
  const csab = await runBacktest(conn, "CSAB", csabGlob, 2, 0.05);

  conn.closeSync();
  instance.closeSync();

  printSummary("JoSAA", josaa);
  printSummary("CSAB", csab);

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
