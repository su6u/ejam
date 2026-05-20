#!/usr/bin/env tsx
/**
 * grid search over JoSAA predictor variants
 *
 * trains each variant on 2021–2024 data, tests against 2025 actuals, and
 * ranks by within-20% accuracy. run this when re-tuning the JoSAA algorithm
 * after adding new years of data or changing the index build pipeline.
 *
 * winner from the last run: trend-cap-3pct — within-20% = 70.5%
 **/

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

interface Variant {
  label: string;
  yearWeights: [number, number, number, number];
  windowSize: 1 | 2 | 3 | 4;
  useTrend: boolean;
  trendGapMultiplier: number;
  trendCapPct: number | null;
  useMedianAnchor: boolean;
  useLastYearOnly: boolean;
}

const VARIANTS: Variant[] = [
  {
    label: "baseline",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "last-year-only",
    yearWeights: [1, 0, 0, 0],
    windowSize: 1,
    useTrend: false,
    trendGapMultiplier: 0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: true,
  },
  {
    label: "no-trend",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: false,
    trendGapMultiplier: 0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "3-year-window",
    yearWeights: [0.55, 0.3, 0.15, 0],
    windowSize: 3,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "2-year-window",
    yearWeights: [0.65, 0.35, 0, 0],
    windowSize: 2,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "trend-cap-2pct",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.02,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "trend-cap-3pct",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.03,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "trend-cap-4pct",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.04,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "trend-cap-5pct",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.05,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "trend-cap-10pct",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.1,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "half-gap-trend",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 0.5,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "high-recency",
    yearWeights: [0.6, 0.25, 0.1, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "low-recency",
    yearWeights: [0.4, 0.3, 0.2, 0.1],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "extreme-recency",
    yearWeights: [0.7, 0.2, 0.07, 0.03],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "cap-3+half-gap",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 0.5,
    trendCapPct: 0.03,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "cap-3+0.7-gap",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 0.7,
    trendCapPct: 0.03,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "cap-3+high-recency",
    yearWeights: [0.55, 0.27, 0.13, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.03,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "cap-3+low-recency",
    yearWeights: [0.4, 0.3, 0.2, 0.1],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.03,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "median+cap-3",
    yearWeights: [0.5, 0.3, 0.15, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.03,
    useMedianAnchor: true,
    useLastYearOnly: false,
  },
  {
    label: "high-recency+cap-5",
    yearWeights: [0.6, 0.25, 0.1, 0.05],
    windowSize: 4,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.05,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "high-recency+no-trend",
    yearWeights: [0.6, 0.25, 0.1, 0.05],
    windowSize: 4,
    useTrend: false,
    trendGapMultiplier: 0,
    trendCapPct: null,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
  {
    label: "3yr+trend-cap-5",
    yearWeights: [0.55, 0.3, 0.15, 0],
    windowSize: 3,
    useTrend: true,
    trendGapMultiplier: 1.0,
    trendCapPct: 0.05,
    useMedianAnchor: false,
    useLastYearOnly: false,
  },
];

interface Row {
  [k: string]: unknown;
  predicted_closing_rank: unknown;
  sigma_effective: unknown;
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
CREATE OR REPLACE TEMP TABLE raw_cutoffs AS SELECT * FROM read_parquet('${glob}') WHERE year <= 2024;
CREATE OR REPLACE TEMP TABLE last_round AS
WITH rn AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender, year ORDER BY round DESC) AS rn FROM raw_cutoffs)
SELECT * FROM rn WHERE rn = 1;
WITH mr AS (SELECT institute_id, program_id, seat_type, quota, gender, MAX(year) AS y FROM last_round GROUP BY institute_id, program_id, seat_type, quota, gender)
SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender,
  GREATEST(50, ROUND(lr.closing_rank * 0.15))::INTEGER AS sigma_effective,
  lr.closing_rank::INTEGER AS predicted_closing_rank
FROM last_round lr JOIN mr ON lr.institute_id = mr.institute_id AND lr.program_id = mr.program_id
  AND lr.seat_type = mr.seat_type AND lr.quota = mr.quota AND lr.gender = mr.gender AND lr.year = mr.y;`;
  }

  const [w1, w2, w3, w4] = v.yearWeights;
  const trend = v.useTrend
    ? v.trendCapPct !== null
      ? `GREATEST(LEAST(COALESCE(s.trend_slope,0), s.weighted_mean*${v.trendCapPct}), -s.weighted_mean*${v.trendCapPct}) * (2025-s.last_data_year) * ${v.trendGapMultiplier}`
      : `COALESCE(s.trend_slope,0) * (2025-s.last_data_year) * ${v.trendGapMultiplier}`
    : `0`;
  const mean = v.useMedianAnchor ? `s.median_mean` : `s.weighted_mean`;

  return `
CREATE OR REPLACE TEMP TABLE raw_cutoffs AS SELECT * FROM read_parquet('${glob}') WHERE year <= 2024;
CREATE OR REPLACE TEMP TABLE normalized AS SELECT institute_id, program_id, seat_type, quota, gender, CASE WHEN instype='3IT' THEN 'IIIT' ELSE instype END AS instype, year, LEAST(round,6) AS round, closing_rank FROM raw_cutoffs;
CREATE OR REPLACE TEMP TABLE deduped AS SELECT institute_id, program_id, seat_type, quota, gender, instype, year, round, MAX(closing_rank) AS closing_rank FROM normalized GROUP BY institute_id, program_id, seat_type, quota, gender, instype, year, round;
CREATE OR REPLACE TEMP TABLE last_round AS WITH rn AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender, year ORDER BY round DESC) AS rn FROM deduped) SELECT * FROM rn WHERE rn=1;
CREATE OR REPLACE TEMP TABLE year_weights AS
WITH windowed AS (SELECT institute_id, program_id, seat_type, quota, gender, year, closing_rank, ROW_NUMBER() OVER (PARTITION BY institute_id, program_id, seat_type, quota, gender ORDER BY year DESC) AS yr FROM last_round QUALIFY yr<=${v.windowSize}),
gs AS (SELECT institute_id, program_id, seat_type, quota, gender, STDDEV_POP(closing_rank) AS s FROM windowed GROUP BY institute_id, program_id, seat_type, quota, gender),
mo AS (SELECT a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year, MEDIAN(b.closing_rank) AS m FROM windowed a JOIN windowed b ON a.institute_id=b.institute_id AND a.program_id=b.program_id AND a.seat_type=b.seat_type AND a.quota=b.quota AND a.gender=b.gender AND a.year!=b.year GROUP BY a.institute_id, a.program_id, a.seat_type, a.quota, a.gender, a.year)
SELECT w.institute_id, w.program_id, w.seat_type, w.quota, w.gender, w.year, w.yr,
  CASE WHEN gs.s IS NOT NULL AND gs.s>0 AND mo.m IS NOT NULL AND ABS(w.closing_rank-mo.m)>2*gs.s THEN 0.01
  ELSE CASE w.yr WHEN 1 THEN ${w1} WHEN 2 THEN ${w2} WHEN 3 THEN ${w3} WHEN 4 THEN ${w4} END END AS w
FROM windowed w LEFT JOIN gs USING (institute_id, program_id, seat_type, quota, gender) LEFT JOIN mo USING (institute_id, program_id, seat_type, quota, gender, year);
CREATE OR REPLACE TEMP TABLE weighted AS SELECT lr.institute_id, lr.program_id, lr.seat_type, lr.quota, lr.gender, lr.year, lr.closing_rank, yw.w FROM last_round lr JOIN year_weights yw ON lr.institute_id=yw.institute_id AND lr.program_id=yw.program_id AND lr.seat_type=yw.seat_type AND lr.quota=yw.quota AND lr.gender=yw.gender AND lr.year=yw.year;
CREATE OR REPLACE TEMP TABLE wmean AS SELECT institute_id, program_id, seat_type, quota, gender, SUM(closing_rank*w)/SUM(w) AS wm, MEDIAN(closing_rank) AS mm FROM weighted GROUP BY institute_id, program_id, seat_type, quota, gender;
CREATE OR REPLACE TEMP TABLE stats AS SELECT d.institute_id, d.program_id, d.seat_type, d.quota, d.gender, ROUND(ANY_VALUE(m.wm))::INTEGER AS weighted_mean, ROUND(ANY_VALUE(m.mm))::INTEGER AS median_mean, ROUND(SQRT(SUM(d.w*POWER(d.closing_rank-m.wm,2))/SUM(d.w)))::INTEGER AS weighted_std, CASE WHEN (SUM(d.w*d.year*d.year)-POWER(SUM(d.w*d.year),2)/SUM(d.w))=0 THEN 0 ELSE ROUND((SUM(d.w*d.year*d.closing_rank)-SUM(d.w*d.year)*SUM(d.w*d.closing_rank)/SUM(d.w))/(SUM(d.w*d.year*d.year)-POWER(SUM(d.w*d.year),2)/SUM(d.w)))::INTEGER END AS trend_slope, COUNT(*)::INTEGER AS years_of_data, MAX(d.year)::INTEGER AS last_data_year FROM weighted d JOIN wmean m ON d.institute_id=m.institute_id AND d.program_id=m.program_id AND d.seat_type=m.seat_type AND d.quota=m.quota AND d.gender=m.gender GROUP BY d.institute_id, d.program_id, d.seat_type, d.quota, d.gender;
SELECT s.institute_id, s.program_id, s.seat_type, s.quota, s.gender, CASE WHEN s.years_of_data<3 THEN ROUND(GREATEST(s.weighted_std,s.weighted_mean*0.03)*1.5)::INTEGER ELSE GREATEST(s.weighted_std,ROUND(s.weighted_mean*0.03))::INTEGER END AS sigma_effective, ROUND(${mean}+${trend})::INTEGER AS predicted_closing_rank FROM stats s;`;
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

function metrics(idx: Map<string, Row>, holdout: HoldoutRow[]): Metrics {
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
    "data/engineering/jee/josaa/cutoffs/year=*/round=*/cutoffs.parquet",
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
    process.stdout.write(`${v.label.padEnd(24)} `);
    try {
      const reader = await conn.runAndReadAll(buildSQL(glob, v));
      const idx = new Map<string, Row>();
      for (const r of reader.getRowObjectsJS())
        idx.set(key(r as unknown as KeyFields), r as unknown as Row);
      const m = metrics(idx, holdout);
      results.push({ label: v.label, m });
      console.log(`within-20% = ${(m.within20pct * 100).toFixed(1)}%`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }
  }

  results.sort((a, b) => b.m.within20pct - a.m.within20pct);
  console.log("\n=== JoSAA variant search (ranked by within-20%) ===\n");
  console.log(
    "rank  variant                   matched  within-10%  within-20%  median-err     MAE",
  );
  console.log("─".repeat(88));
  results.forEach(({ label, m }, i) => {
    console.log(
      `${String(i + 1).padStart(3)}   ${label.padEnd(24)}  ${String(m.programsMatched).padStart(6)}  ${(m.within10pct * 100).toFixed(1).padStart(8)}%  ${(m.within20pct * 100).toFixed(1).padStart(8)}%  ${String(m.medianAeRanks).padStart(9)}  ${String(m.maeRanks).padStart(7)}`,
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
