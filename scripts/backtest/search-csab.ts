#!/usr/bin/env tsx
/**
 * grid search over CSAB predictor variants
 *
 * trains each variant on 2021–2024 CSAB data, tests against 2025 actuals.
 * run this when re-tuning the CSAB algorithm after adding new years of data.
 *
 * CSAB structural differences from JoSAA:
 *   - 2–3 rounds per year (vs 6)
 *   - rank ranges 10k–1M (vs 1–50k for top JoSAA programs)
 *   - 5 years of data (2021–2025)
 *   - candidate pool is post-JoSAA students — more volatile year-to-year
 *   - 2021–2022 are anomalous early years; shorter windows outperform longer ones
 *
 * winner from the last run: 2yr+trend-cap5 — within-20% = 68.0%
 **/

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

interface Variant {
  label: string;
  yearWeights: [number, number, number, number, number];
  windowSize: 1 | 2 | 3 | 4 | 5;
  useTrend: boolean;
  trendCapPct: number | null;
  trendGapMultiplier: number;
  useLastYearOnly: boolean;
}

const VARIANTS: Variant[] = [
  {
    label: "baseline",
    yearWeights: [0.5, 0.3, 0.15, 0.05, 0],
    windowSize: 4,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "last-year-only",
    yearWeights: [1, 0, 0, 0, 0],
    windowSize: 1,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: true,
  },
  {
    label: "no-trend",
    yearWeights: [0.5, 0.3, 0.15, 0.05, 0],
    windowSize: 4,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "5yr-equal-weight",
    yearWeights: [0.2, 0.2, 0.2, 0.2, 0.2],
    windowSize: 5,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "5yr+high-rec+cap3",
    yearWeights: [0.45, 0.25, 0.15, 0.1, 0.05],
    windowSize: 5,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "3yr-window",
    yearWeights: [0.55, 0.3, 0.15, 0, 0],
    windowSize: 3,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "3yr-no-trend",
    yearWeights: [0.55, 0.3, 0.15, 0, 0],
    windowSize: 3,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "3yr+high-rec+cap3",
    yearWeights: [0.6, 0.27, 0.13, 0, 0],
    windowSize: 3,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "2yr-window",
    yearWeights: [0.65, 0.35, 0, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+no-trend",
    yearWeights: [0.65, 0.35, 0, 0, 0],
    windowSize: 2,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+trend-cap3",
    yearWeights: [0.65, 0.35, 0, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+trend-cap5",
    yearWeights: [0.65, 0.35, 0, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendCapPct: 0.05,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+high-rec",
    yearWeights: [0.7, 0.3, 0, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 1.0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+high-rec+no-trend",
    yearWeights: [0.7, 0.3, 0, 0, 0],
    windowSize: 2,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+extreme-rec",
    yearWeights: [0.75, 0.25, 0, 0, 0],
    windowSize: 2,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+equal-weight",
    yearWeights: [0.5, 0.5, 0, 0, 0],
    windowSize: 2,
    useTrend: false,
    trendCapPct: null,
    trendGapMultiplier: 0,
    useLastYearOnly: false,
  },
  {
    label: "2yr+half-gap",
    yearWeights: [0.65, 0.35, 0, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendCapPct: 0.03,
    trendGapMultiplier: 0.5,
    useLastYearOnly: false,
  },
];

interface Row {
  [k: string]: unknown;
  predicted_closing_rank: unknown;
}
interface HoldoutRow {
  institute_id: string;
  program_id: string;
  seat_type: string;
  quota: string;
  gender: string;
  closing_rank: number;
}
interface Metrics {
  programsMatched: number;
  maeRanks: number;
  medianAeRanks: number;
  within10pct: number;
  within20pct: number;
}

function buildSQL(glob: string, v: Variant): string {
  if (v.useLastYearOnly) {
    return `
CREATE OR REPLACE TEMP TABLE rc AS SELECT * FROM read_parquet('${glob}') WHERE year<=2024;
CREATE OR REPLACE TEMP TABLE lr AS WITH rn AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender, year ORDER BY round DESC) AS rn FROM rc) SELECT * FROM rn WHERE rn=1;
WITH mr AS (SELECT institute_id, program_id, seat_type, quota, gender, MAX(year) AS y FROM lr GROUP BY institute_id, program_id, seat_type, quota, gender)
SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender, lr.closing_rank::INTEGER AS predicted_closing_rank FROM lr JOIN mr ON lr.institute_id=mr.institute_id AND lr.program_id=mr.program_id AND lr.seat_type=mr.seat_type AND lr.quota=mr.quota AND lr.gender=mr.gender AND lr.year=mr.y;`;
  }

  const w = v.yearWeights;
  const trend = v.useTrend
    ? v.trendCapPct !== null
      ? `GREATEST(LEAST(COALESCE(s.trend_slope,0),s.weighted_mean*${v.trendCapPct}),-s.weighted_mean*${v.trendCapPct})*(2025-s.last_data_year)*${v.trendGapMultiplier}`
      : `COALESCE(s.trend_slope,0)*(2025-s.last_data_year)*${v.trendGapMultiplier}`
    : `0`;

  return `
CREATE OR REPLACE TEMP TABLE rc AS SELECT * FROM read_parquet('${glob}') WHERE year<=2024;
CREATE OR REPLACE TEMP TABLE norm AS SELECT institute_id, program_id, seat_type, quota, gender, CASE WHEN instype='3IT' THEN 'IIIT' ELSE instype END AS instype, year, LEAST(round,6) AS round, closing_rank FROM rc;
CREATE OR REPLACE TEMP TABLE dd AS SELECT institute_id, program_id, seat_type, quota, gender, instype, year, round, MAX(closing_rank) AS closing_rank FROM norm GROUP BY institute_id, program_id, seat_type, quota, gender, instype, year, round;
CREATE OR REPLACE TEMP TABLE lr AS WITH rn AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender, year ORDER BY round DESC) AS rn FROM dd) SELECT * FROM rn WHERE rn=1;
CREATE OR REPLACE TEMP TABLE yw AS
WITH win AS (SELECT institute_id, program_id, seat_type, quota, gender, year, closing_rank, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender ORDER BY year DESC) AS yr FROM lr QUALIFY yr<=${v.windowSize}),
gs AS (SELECT institute_id, program_id, seat_type, quota, gender, STDDEV_POP(closing_rank) AS s FROM win GROUP BY institute_id, program_id, seat_type, quota, gender),
mo AS (SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year, MEDIAN(b.closing_rank) AS m FROM win a JOIN win b ON a.institute_id=b.institute_id AND a.program_id=b.program_id AND a.seat_type=b.seat_type AND a.quota=b.quota AND a.gender=b.gender AND a.year!=b.year GROUP BY a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year)
SELECT w.institute_id, w.program_id, w.seat_type, w.quota, w.gender, w.year, w.yr,
  CASE WHEN gs.s IS NOT NULL AND gs.s>0 AND mo.m IS NOT NULL AND ABS(w.closing_rank-mo.m)>2*gs.s THEN 0.01
  ELSE CASE w.yr WHEN 1 THEN ${w[0]} WHEN 2 THEN ${w[1]} WHEN 3 THEN ${w[2]} WHEN 4 THEN ${w[3]} WHEN 5 THEN ${w[4]} END END AS w
FROM win w LEFT JOIN gs USING (institute_id, program_id, seat_type, quota, gender) LEFT JOIN mo USING (institute_id, program_id, seat_type, quota, gender, year);
CREATE OR REPLACE TEMP TABLE wt AS SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender, lr.year, lr.closing_rank, yw.w FROM lr JOIN yw ON lr.institute_id=yw.institute_id AND lr.program_id=yw.program_id AND lr.seat_type=yw.seat_type AND lr.quota=yw.quota AND lr.gender=yw.gender AND lr.year=yw.year;
CREATE OR REPLACE TEMP TABLE wm AS SELECT institute_id, program_id, seat_type, quota, gender, SUM(closing_rank*w)/SUM(w) AS wm FROM wt GROUP BY institute_id, program_id, seat_type, quota, gender;
CREATE OR REPLACE TEMP TABLE st AS SELECT d.institute_id, d.program_id, d.seat_type, d.quota, d.gender, ROUND(ANY_VALUE(m.wm))::INTEGER AS weighted_mean, ROUND(SQRT(SUM(d.w*POWER(d.closing_rank-m.wm,2))/SUM(d.w)))::INTEGER AS weighted_std, CASE WHEN (SUM(d.w*d.year*d.year)-POWER(SUM(d.w*d.year),2)/SUM(d.w))=0 THEN 0 ELSE ROUND((SUM(d.w*d.year*d.closing_rank)-SUM(d.w*d.year)*SUM(d.w*d.closing_rank)/SUM(d.w))/(SUM(d.w*d.year*d.year)-POWER(SUM(d.w*d.year),2)/SUM(d.w)))::INTEGER END AS trend_slope, COUNT(*)::INTEGER AS years_of_data, MAX(d.year)::INTEGER AS last_data_year FROM wt d JOIN wm m ON d.institute_id=m.institute_id AND d.program_id=m.program_id AND d.seat_type=m.seat_type AND d.quota=m.quota AND d.gender=m.gender GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender;
SELECT s.institute_id, s.program_id, s.seat_type, s.quota, s.gender, ROUND(s.weighted_mean+${trend})::INTEGER AS predicted_closing_rank FROM st s;`;
}

function buildHoldoutSQL(glob: string): string {
  return `WITH a AS (SELECT * FROM read_parquet('${glob}') WHERE year=2025), mr AS (SELECT institute_id, program_id, seat_type, quota, gender, MAX(round) AS r FROM a GROUP BY institute_id, program_id, seat_type, quota, gender) SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.closing_rank FROM a JOIN mr ON a.institute_id=mr.institute_id AND a.program_id=mr.program_id AND a.seat_type=mr.seat_type AND a.quota=mr.quota AND a.gender=mr.gender AND a.round=mr.r;`;
}

type KeyFields = {
  institute_id: unknown;
  program_id: unknown;
  seat_type: unknown;
  quota: unknown;
  gender: unknown;
};

function key(r: KeyFields): string {
  return `${r.institute_id}|${r.program_id}|${r.seat_type}|${r.quota}|${r.gender}`;
}

function computeMetrics(idx: Map<string, Row>, holdout: HoldoutRow[]): Metrics {
  const errs: number[] = [];
  let w10 = 0,
    w20 = 0,
    n = 0;
  for (const h of holdout) {
    const t = idx.get(key(h));
    if (!t) continue;
    n++;
    const err = Math.abs(Number(t.predicted_closing_rank) - h.closing_rank);
    errs.push(err);
    const pct = err / h.closing_rank;
    if (pct <= 0.1) w10++;
    if (pct <= 0.2) w20++;
  }
  if (n === 0)
    return {
      programsMatched: 0,
      maeRanks: 0,
      medianAeRanks: 0,
      within10pct: 0,
      within20pct: 0,
    };
  errs.sort((a, b) => a - b);
  return {
    programsMatched: n,
    maeRanks: Math.round(errs.reduce((s, e) => s + e, 0) / n),
    medianAeRanks: errs[Math.floor(n / 2)] ?? 0,
    within10pct: w10 / n,
    within20pct: w20 / n,
  };
}

async function main(): Promise<void> {
  const glob = path.join(
    ROOT,
    "data/engineering/jee/csab/cutoffs/year=*/round=*/cutoffs.parquet",
  );
  const { DuckDBInstance } = await import("@duckdb/node-api");
  const inst = await DuckDBInstance.create(":memory:");
  const conn = await inst.connect();

  const holdoutReader = await conn.runAndReadAll(buildHoldoutSQL(glob));
  const holdout: HoldoutRow[] = holdoutReader.getRowObjectsJS().map((r) => ({
    institute_id: String(r.institute_id),
    program_id: String(r.program_id),
    seat_type: String(r.seat_type),
    quota: String(r.quota),
    gender: String(r.gender),
    closing_rank: Number(r.closing_rank),
  }));
  console.log(`Holdout: ${holdout.length} programs\n`);

  const results: Array<{ label: string; m: Metrics }> = [];
  for (const v of VARIANTS) {
    process.stdout.write(`${v.label.padEnd(26)} `);
    try {
      const reader = await conn.runAndReadAll(buildSQL(glob, v));
      const idx = new Map<string, Row>();
      for (const r of reader.getRowObjectsJS())
        idx.set(key(r as unknown as KeyFields), r as unknown as Row);
      const m = computeMetrics(idx, holdout);
      results.push({ label: v.label, m });
      console.log(`within-20% = ${(m.within20pct * 100).toFixed(1)}%`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
  }

  results.sort((a, b) => b.m.within20pct - a.m.within20pct);
  console.log("\n=== CSAB variant search (ranked by within-20%) ===\n");
  console.log(
    "rank  variant                     matched  within-10%  within-20%  median-err     MAE",
  );
  console.log("─".repeat(90));
  results.forEach(({ label, m }, i) => {
    console.log(
      `${String(i + 1).padStart(3)}   ${label.padEnd(26)}  ${String(m.programsMatched).padStart(6)}  ${(m.within10pct * 100).toFixed(1).padStart(8)}%  ${(m.within20pct * 100).toFixed(1).padStart(8)}%  ${String(m.medianAeRanks).padStart(9)}  ${String(m.maeRanks).padStart(7)}`,
    );
  });

  const winner = results[0]!;
  const base = results.find((r) => r.label === "baseline")!;
  console.log(
    `\nWinner: ${winner.label}  within-20% = ${(winner.m.within20pct * 100).toFixed(1)}%  (baseline: ${(base.m.within20pct * 100).toFixed(1)}%  lift: ${((winner.m.within20pct - base.m.within20pct) * 100).toFixed(1)}pp)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
