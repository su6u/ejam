/**
 * Jam predictor algorithm config — shared by production build and backtests.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const JAM_JOSAA_V2 = "jam-josaa-v2";

export const POOL_STATS_PATH = path.join(
  ROOT,
  "scripts/jam/nta-pool-stats.json",
);

/** Shared hyperparams for jam-josaa predictors. */
export const JAM_TUNED = {
  outlierGuardMultiplier: 2.5,
  sigmaFloorPct: 0.025,
  trendGapMultiplier: 0.7,
  trendCapPct: 0.03,
  windowSize: 4,
  yearWeights: [0.5, 0.3, 0.15, 0.05] as const,
  sigmaInflation: 1.5,
  sparseYearsThreshold: 3,
};

/** Round weights for jam-josaa-v2 round_weighted anchor (r1 … r6). */
export const JAM_ROUND_WEIGHTS = {
  1: 0.05,
  2: 0.08,
  3: 0.12,
  4: 0.15,
  5: 0.22,
  6: 0.38,
} as const;

export function loadNtaPoolShiftPct(): number {
  if (!fs.existsSync(POOL_STATS_PATH)) return 0.0429;
  const j = JSON.parse(fs.readFileSync(POOL_STATS_PATH, "utf8")) as {
    pool_calibration?: { unique_appeared_yoy?: { implied_pool_shift_if_literal?: number } };
  };
  return j.pool_calibration?.unique_appeared_yoy?.implied_pool_shift_if_literal ?? 0.0429;
}

/** EJAM_POOL_SHIFT_PCT overrides NTA-derived pool shift when set. */
export function resolvePoolShiftPct(): number {
  const raw = process.env.EJAM_POOL_SHIFT_PCT;
  if (raw !== undefined && raw !== "") {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) return n;
    throw new Error(`EJAM_POOL_SHIFT_PCT must be a non-negative number, got: ${raw}`);
  }
  return loadNtaPoolShiftPct();
}

/** SQL CASE expression weighting rounds for the anchor_round CTE. */
export function roundWeightCaseSql(): string {
  return `CASE round
    WHEN 1 THEN ${JAM_ROUND_WEIGHTS[1]}
    WHEN 2 THEN ${JAM_ROUND_WEIGHTS[2]}
    WHEN 3 THEN ${JAM_ROUND_WEIGHTS[3]}
    WHEN 4 THEN ${JAM_ROUND_WEIGHTS[4]}
    WHEN 5 THEN ${JAM_ROUND_WEIGHTS[5]}
    WHEN 6 THEN ${JAM_ROUND_WEIGHTS[6]}
    ELSE 0.1
  END`;
}
