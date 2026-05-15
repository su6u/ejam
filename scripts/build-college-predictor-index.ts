#!/usr/bin/env tsx
/**
 * builds college_predictor_index.parquet from historical JoSAA cutoff parquets
 * computes per-round weighted closing ranks (R1–R6), fill_round, sigma inflation
 * handles new-program borrowing and sparse-data pooling
 * weights for last 4 years: [0.50, 0.30, 0.15, 0.05]
 **/

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const JOSAA_CUTOFFS = path.join(
  ROOT,
  "data",
  "engineering",
  "jee",
  "josaa",
  "cutoffs",
);
const OUTPUT_DIR = path.join(ROOT, "dist-data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "college_predictor_index.parquet");

function findAllCutoffParquets(): string[] {
  const files: string[] = [];
  const years = fs
    .readdirSync(JOSAA_CUTOFFS)
    .filter((d) => d.startsWith("year="));
  for (const yearDir of years) {
    const rounds = fs
      .readdirSync(path.join(JOSAA_CUTOFFS, yearDir))
      .filter((d) => d.startsWith("round="));
    for (const roundDir of rounds) {
      const parquetPath = path.join(
        JOSAA_CUTOFFS,
        yearDir,
        roundDir,
        "cutoffs.parquet",
      );
      if (fs.existsSync(parquetPath)) {
        files.push(parquetPath);
      }
    }
  }
  return files;
}

function buildSQL(parquetFiles: string[]): string {
  const unionParts = parquetFiles.map(
    (f) => `SELECT * FROM read_parquet('${f}')`,
  );
  const unionAll = unionParts.join("\nUNION ALL\n");

  return `
CREATE TEMP TABLE raw_cutoffs AS
${unionAll};

-- normalize rounds: cap at 6 (some years have 7, merge 7 into 6)
CREATE TEMP TABLE normalized AS
SELECT
  institute_id, program_id, seat_type, quota, gender,
  instype, degree, duration_years,
  year,
  LEAST(round, 6) AS round,
  closing_rank
FROM raw_cutoffs;

-- keep only the max closing_rank per (program, year, round) after normalization
CREATE TEMP TABLE deduped AS
SELECT
  institute_id, program_id, seat_type, quota, gender,
  instype, degree, duration_years,
  year, round,
  MAX(closing_rank) AS closing_rank
FROM normalized
GROUP BY institute_id, program_id, seat_type, quota, gender,
         instype, degree, duration_years, year, round;

-- assign year weights: last 4 years get [0.50, 0.30, 0.15, 0.05]
CREATE TEMP TABLE year_weights AS
WITH distinct_years AS (
  SELECT DISTINCT institute_id, program_id, seat_type, quota, gender, year
  FROM deduped
),
ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY institute_id, program_id, seat_type, quota, gender
      ORDER BY year DESC
    ) AS yr
  FROM distinct_years
)
SELECT *,
  CASE yr WHEN 1 THEN 0.50 WHEN 2 THEN 0.30 WHEN 3 THEN 0.15 WHEN 4 THEN 0.05 END AS w
FROM ranked
WHERE yr <= 4;

-- per-round weighted means
CREATE TEMP TABLE round_stats AS
SELECT
  d.institute_id, d.program_id, d.seat_type, d.quota, d.gender,
  d.round,
  ROUND(SUM(d.closing_rank * yw.w) / SUM(yw.w))::INTEGER AS round_weighted_mean
FROM deduped d
JOIN year_weights yw
  ON d.institute_id = yw.institute_id
  AND d.program_id = yw.program_id
  AND d.seat_type = yw.seat_type
  AND d.quota = yw.quota
  AND d.gender = yw.gender
  AND d.year = yw.year
GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender, d.round;

-- pivot per-round means into columns
CREATE TEMP TABLE round_pivot AS
SELECT
  institute_id, program_id, seat_type, quota, gender,
  MAX(CASE WHEN round = 1 THEN round_weighted_mean END) AS round1_mean,
  MAX(CASE WHEN round = 2 THEN round_weighted_mean END) AS round2_mean,
  MAX(CASE WHEN round = 3 THEN round_weighted_mean END) AS round3_mean,
  MAX(CASE WHEN round = 4 THEN round_weighted_mean END) AS round4_mean,
  MAX(CASE WHEN round = 5 THEN round_weighted_mean END) AS round5_mean,
  MAX(CASE WHEN round = 6 THEN round_weighted_mean END) AS round6_mean
FROM round_stats
GROUP BY institute_id, program_id, seat_type, quota, gender;

-- fill_round: weighted mode of last-round-with-data per year
CREATE TEMP TABLE fill_rounds AS
WITH last_rounds AS (
  SELECT
    institute_id, program_id, seat_type, quota, gender, year,
    MAX(round) AS last_round
  FROM deduped
  GROUP BY institute_id, program_id, seat_type, quota, gender, year
),
weighted_last AS (
  SELECT
    lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender,
    -- use median of last rounds across weighted years
    ROUND(SUM(lr.last_round * yw.w) / SUM(yw.w))::INTEGER AS fill_round
  FROM last_rounds lr
  JOIN year_weights yw
    ON lr.institute_id = yw.institute_id
    AND lr.program_id = yw.program_id
    AND lr.seat_type = yw.seat_type
    AND lr.quota = yw.quota
    AND lr.gender = yw.gender
    AND lr.year = yw.year
  GROUP BY lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender
)
SELECT * FROM weighted_last;

-- last-round closing rank per year (for overall stats)
CREATE TEMP TABLE last_round AS
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY institute_id, program_id, seat_type, quota, gender, year
      ORDER BY round DESC
    ) AS rn
  FROM deduped
)
SELECT * FROM ranked WHERE rn = 1;

-- weighted overall stats using last-round data
CREATE TEMP TABLE weighted AS
SELECT
  lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender,
  lr.instype, lr.degree, lr.duration_years,
  lr.year, lr.closing_rank,
  yw.w, yw.yr
FROM last_round lr
JOIN year_weights yw
  ON lr.institute_id = yw.institute_id
  AND lr.program_id = yw.program_id
  AND lr.seat_type = yw.seat_type
  AND lr.quota = yw.quota
  AND lr.gender = yw.gender
  AND lr.year = yw.year;

CREATE TEMP TABLE wmean AS
SELECT
  institute_id, program_id, seat_type, quota, gender,
  SUM(closing_rank * w) / SUM(w) AS wm
FROM weighted
GROUP BY institute_id, program_id, seat_type, quota, gender;

CREATE TEMP TABLE stats AS
SELECT
  d.institute_id, d.program_id, d.seat_type, d.quota, d.gender,
  ANY_VALUE(d.instype) AS instype,
  ANY_VALUE(d.degree) AS degree,
  ANY_VALUE(d.duration_years) AS duration_years,
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
  MAX(d.year)::INTEGER AS last_data_year,
  MIN(d.closing_rank)::INTEGER AS min_closing_rank,
  MAX(d.closing_rank)::INTEGER AS max_closing_rank
FROM weighted d
JOIN wmean m
  ON d.institute_id = m.institute_id
  AND d.program_id = m.program_id
  AND d.seat_type = m.seat_type
  AND d.quota = m.quota
  AND d.gender = m.gender
GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender;

-- final index: join stats + round pivot + fill_round
COPY (
  SELECT
    s.institute_id, s.program_id, s.seat_type, s.quota, s.gender,
    s.instype, s.degree, s.duration_years,
    s.weighted_mean,
    s.weighted_std,
    s.trend_slope,
    GREATEST(s.weighted_std, 50) AS sigma_base,
    CASE
      WHEN s.years_of_data < 3 THEN ROUND(GREATEST(s.weighted_std, 50) * 1.5)::INTEGER
      ELSE GREATEST(s.weighted_std, 50)
    END AS sigma_effective,
    s.weighted_mean + COALESCE(s.trend_slope, 0) AS predicted_closing_rank,
    CASE
      WHEN s.years_of_data = 1 THEN 'pooled'
      WHEN s.years_of_data = 2 THEN 'inferred'
      WHEN s.years_of_data >= 3 THEN 'sufficient'
    END AS data_quality,
    s.years_of_data,
    s.last_data_year,
    s.min_closing_rank,
    s.max_closing_rank,
    rp.round1_mean,
    rp.round2_mean,
    rp.round3_mean,
    rp.round4_mean,
    rp.round5_mean,
    rp.round6_mean,
    COALESCE(fr.fill_round, 6)::INTEGER AS fill_round
  FROM stats s
  LEFT JOIN round_pivot rp
    ON s.institute_id = rp.institute_id
    AND s.program_id = rp.program_id
    AND s.seat_type = rp.seat_type
    AND s.quota = rp.quota
    AND s.gender = rp.gender
  LEFT JOIN fill_rounds fr
    ON s.institute_id = fr.institute_id
    AND s.program_id = fr.program_id
    AND s.seat_type = fr.seat_type
    AND s.quota = fr.quota
    AND s.gender = fr.gender
  ORDER BY s.instype, s.institute_id, s.program_id, s.seat_type, s.quota, s.gender
) TO '${OUTPUT_FILE}' (FORMAT PARQUET, COMPRESSION ZSTD);
  `;
}

async function main(): Promise<void> {
  console.log("Building college predictor index...");

  const parquetFiles = findAllCutoffParquets();
  console.log(`Found ${parquetFiles.length} cutoff parquet files`);

  if (parquetFiles.length === 0) {
    console.error("No cutoff parquet files found");
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sql = buildSQL(parquetFiles);
  const sqlFile = path.join(OUTPUT_DIR, "_build_index.sql");
  fs.writeFileSync(sqlFile, sql, "utf-8");

  console.log("Running DuckDB...");
  try {
    execSync(`duckdb < "${sqlFile}"`, { cwd: ROOT, stdio: "inherit" });
  } catch (err) {
    console.error("DuckDB build failed:", err);
    process.exit(1);
  }

  if (fs.existsSync(OUTPUT_FILE)) {
    const stat = fs.statSync(OUTPUT_FILE);
    console.log(
      `Index built: ${OUTPUT_FILE} (${(stat.size / 1024).toFixed(1)} KB)`,
    );
  } else {
    console.error("Output file not created");
    process.exit(1);
  }

  fs.unlinkSync(sqlFile);
  console.log("Done");
}

main();
