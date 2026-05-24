/**
 * CSAB predictor algorithm config — shared by sandbox, backtests, and production build.
 * Tune via sandbox (experiment-csab*.ts); promote winner here.
 */

export const JAM_CSAB_V2 = "jam-csab-v2";

/** Production baseline before sandbox tuning (2yr 65/35, ±5% trend). */
export const CSAB_BASE = {
  windowSize: 2 as const,
  yearWeights: [0.65, 0.35, 0, 0, 0] as const,
  trendCapPct: 0.05,
  trendGapMultiplier: 1.0,
  sigmaFloorPct: 0.03,
  sigmaInflation: 1.5,
  outlierGuardMultiplier: 2,
  sparseYearsThreshold: 3,
};

/** Shared hyperparams for tuned / ensemble variants. */
export const CSAB_TUNED = {
  windowSize: 2 as const,
  yearWeights: [0.7, 0.3, 0, 0, 0] as const,
  trendCapPct: 0.06,
  trendGapMultiplier: 1.0,
  sigmaFloorPct: 0.03,
  sigmaInflation: 1.5,
  outlierGuardMultiplier: 2.5,
  /** Default median blend when no instype override applies. */
  medianBlend: 0.35,
  sparseYearsThreshold: 3,
};

export type CsabInstype = "NIT" | "CFI" | "IIIT";

export type CsabInstypeProfile = Partial<
  Record<CsabInstype, { medianBlend?: number; trendCapPct?: number }>
>;

/** Phase-5 candidate: instype-split median blends. */
export const CSAB_PROFILE_BEST_SPLIT: CsabInstypeProfile = {
  NIT: { medianBlend: 0.35 },
  CFI: { medianBlend: 0.6 },
  IIIT: { medianBlend: 0.4 },
};

/** Phase-5 candidate: CFI/IIIT trend caps + blends. */
export const CSAB_PROFILE_CAP_CFI10: CsabInstypeProfile = {
  NIT: { medianBlend: 0.35 },
  CFI: { medianBlend: 0.55, trendCapPct: 0.1 },
  IIIT: { medianBlend: 0.45, trendCapPct: 0.06 },
};

/** Production ensemble for jam-csab-v2 (ens-best-split + cap-cfi10). */
export const CSAB_PRODUCTION = {
  ensemble: [
    { label: "best-split", profile: CSAB_PROFILE_BEST_SPLIT, weight: 0.5 },
    { label: "cap-cfi10", profile: CSAB_PROFILE_CAP_CFI10, weight: 0.5 },
  ] as const,
};

function blendedMeanForProfileSql(
  profile: CsabInstypeProfile,
  alias: string,
): string {
  const defaultBlend = CSAB_TUNED.medianBlend;
  const defaultExpr = `(1-${defaultBlend})*${alias}.weighted_mean + ${defaultBlend}*${alias}.median_mean`;
  const cases: string[] = [];
  for (const instype of ["NIT", "CFI", "IIIT"] as const) {
    const blend = profile[instype]?.medianBlend;
    if (blend === undefined) continue;
    cases.push(
      `WHEN '${instype}' THEN (1-${blend})*${alias}.weighted_mean + ${blend}*${alias}.median_mean`,
    );
  }
  if (cases.length === 0) return defaultExpr;
  return `CASE ${alias}.instype ${cases.join(" ")} ELSE ${defaultExpr} END`;
}

function trendDeltaForProfileSql(
  profile: CsabInstypeProfile,
  predictionYear: number,
  alias: string,
): string {
  const { trendCapPct, trendGapMultiplier } = CSAB_TUNED;
  const defaultTrend = `GREATEST(LEAST(COALESCE(${alias}.trend_slope,0), ${alias}.weighted_mean*${trendCapPct}), -${alias}.weighted_mean*${trendCapPct}) * ${trendGapMultiplier} * (${predictionYear} - ${alias}.last_data_year)`;
  const cases: string[] = [];
  for (const instype of ["NIT", "CFI", "IIIT"] as const) {
    const cap = profile[instype]?.trendCapPct;
    if (cap === undefined) continue;
    cases.push(
      `WHEN '${instype}' THEN GREATEST(LEAST(COALESCE(${alias}.trend_slope,0), ${alias}.weighted_mean*${cap}), -${alias}.weighted_mean*${cap}) * ${trendGapMultiplier} * (${predictionYear} - ${alias}.last_data_year)`,
    );
  }
  if (cases.length === 0) return defaultTrend;
  return `CASE ${alias}.instype ${cases.join(" ")} ELSE ${defaultTrend} END`;
}

export function csabPredictedRankForProfileSql(
  profile: CsabInstypeProfile,
  predictionYear: number,
  alias = "s",
): string {
  const mean = blendedMeanForProfileSql(profile, alias);
  const trend = trendDeltaForProfileSql(profile, predictionYear, alias);
  return `ROUND(${mean} + ${trend})`;
}

/** Equal-weight ensemble of best-split + cap-cfi10 (production). */
export function csabEnsemblePredictedRankSql(
  predictionYear: number,
  alias = "s",
): string {
  const parts = CSAB_PRODUCTION.ensemble.map((v) =>
    csabPredictedRankForProfileSql(v.profile, predictionYear, alias),
  );
  return `ROUND((${parts.join(" + ")}) / ${parts.length}.0)`;
}

/** Uniform 35% median blend — legacy helper for sandbox baseline SQL. */
export function csabBlendedMeanSql(tableAlias = "s"): string {
  const b = CSAB_TUNED.medianBlend;
  if (b === 0) return `${tableAlias}.weighted_mean`;
  return `(1-${b})*${tableAlias}.weighted_mean + ${b}*${tableAlias}.median_mean`;
}

export function csabYearWeightCaseSql(
  weights: readonly [number, number, number, number, number],
): string {
  return `CASE w.yr WHEN 1 THEN ${weights[0]} WHEN 2 THEN ${weights[1]} WHEN 3 THEN ${weights[2]} WHEN 4 THEN ${weights[3]} WHEN 5 THEN ${weights[4]} END`;
}
