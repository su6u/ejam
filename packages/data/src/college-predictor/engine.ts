/**
 * college predictor probability engine — pure functions, no side effects
 * uses normal CDF (Φ) for probability from pre-computed index rows + student rank
 * supports per-round trajectory with fill_round freeze
 **/

export interface CollegePredictorIndexRow {
  institute_id: string;
  program_id: string;
  program_name?: string;
  seat_type: string;
  quota: string;
  gender: string;
  instype: string;
  state?: string;
  degree: string;
  duration_years: number;
  weighted_mean: number;
  weighted_std: number;
  trend_slope: number;
  sigma_base: number;
  sigma_effective: number;
  predicted_closing_rank: number;
  data_quality: "sufficient" | "inferred" | "pooled";
  years_of_data: number;
  last_data_year: number;
  min_closing_rank: number;
  max_closing_rank: number;
  round1_mean: number | null;
  round2_mean: number | null;
  round3_mean: number | null;
  round4_mean: number | null;
  round5_mean: number | null;
  round6_mean: number | null;
  fill_round: number;
}

export type ProbabilityBand = "safe" | "target" | "reach" | "long-shot";

/** reach band starts here; long-shots are strictly below */
export const REACH_BAND_MIN_PROBABILITY = 0.1;

/** default UI display includes long-shots — only exact zero-chance rows are hidden */
export const DEFAULT_PROBABILITY_DISPLAY_THRESHOLD = 0;

export interface ProgramPrediction {
  institute_id: string;
  program_id: string;
  program_name?: string;
  seat_type: string;
  quota: string;
  gender: string;
  instype: string;
  state?: string;
  degree: string;
  duration_years: number;
  weighted_mean: number;
  predicted_closing_rank: number;
  sigma_effective: number;
  cumulative_probability: number;
  band: ProbabilityBand;
  data_quality: "sufficient" | "inferred" | "pooled";
  years_of_data: number;
  last_data_year: number;
  fill_round: number;
  round_probs: number[];
  /** 0–100 institute quality for balanced ranking */
  institute_score?: number;
  /** 0–100 branch desirability for balanced ranking */
  branch_score?: number;
  /** composite pick score — higher is a better overall option */
  balanced_score?: number;
}

export interface CollegePredictionResult {
  programs: ProgramPrediction[];
  metadata: {
    total_matching: number;
    total_above_threshold: number;
    threshold_used: number;
    hidden_count: number;
    total_matching_programs: number;
    displayed_programs: number;
    hidden_programs: number;
    active_filters: CollegePredictorFilters;
  };
  grouped_by_band: Record<ProbabilityBand, ProgramPrediction[]>;
  ews_comparison?: {
    base: CollegePredictionResult;
    ews: CollegePredictionResult;
    // shown when the student asserted they hold a valid EWS certificate
    caveat?: string;
  };
}

// Abramowitz and Stegun 7.1.26 — approximates erf(x), converted to Φ via Φ(x) = 0.5(1 + erf(x/√2))
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * absX);
  const erf =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1 + sign * erf);
}

export function computeProbability(
  studentRank: number,
  predictedClosingRank: number,
  sigmaEffective: number,
): number {
  const sigma = Math.max(sigmaEffective, 1);
  const z = (predictedClosingRank - studentRank) / sigma;
  return normalCDF(z);
}

export function classifyBand(probability: number): ProbabilityBand {
  if (probability >= 0.85) return "safe";
  if (probability >= 0.4) return "target";
  if (probability >= REACH_BAND_MIN_PROBABILITY) return "reach";
  return "long-shot";
}

export interface CollegePredictorFilters {
  institute_type?: string[];
  state?: string[];
  branch_name?: string | string[];
  band?: ProbabilityBand[];
}

const BAND_ORDER: Record<ProbabilityBand, number> = {
  safe: 0,
  target: 1,
  reach: 2,
  "long-shot": 3,
};

const BRANCH_ALIASES: Record<string, string[]> = {
  cse: ["computer science", "cse", "cs", "computer-science"],
  ece: ["electronics communication", "electronics and communication", "ece"],
  ee: ["electrical", "ee"],
  me: ["mechanical", "me", "mech"],
  ce: ["civil", "ce"],
};

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function branchNeedles(branchName: string | string[] | undefined): string[] {
  if (!branchName) return [];
  const raw = Array.isArray(branchName) ? branchName : [branchName];
  return unique(
    raw.flatMap((value) => {
      const normalized = normalizeSearch(value);
      return [normalized, ...(BRANCH_ALIASES[normalized] ?? [])].map(
        normalizeSearch,
      );
    }),
  );
}

export function applyCollegePredictorFilters(
  rows: CollegePredictorIndexRow[],
  filters: CollegePredictorFilters = {},
): CollegePredictorIndexRow[] {
  const instituteTypes = new Set(filters.institute_type ?? []);
  const states = new Set(filters.state ?? []);
  const branches = branchNeedles(filters.branch_name);

  return rows.filter((row) => {
    if (instituteTypes.size > 0 && !instituteTypes.has(row.instype))
      return false;
    if (states.size > 0 && (!row.state || !states.has(row.state))) return false;

    if (branches.length > 0) {
      const haystack = normalizeSearch(
        `${row.program_id} ${row.program_name ?? ""}`,
      );
      if (!branches.some((branch) => haystack.includes(branch))) return false;
    }

    return true;
  });
}

export function groupProgramsByBand(
  programs: ProgramPrediction[],
): Record<ProbabilityBand, ProgramPrediction[]> {
  return {
    safe: programs.filter((program) => program.band === "safe"),
    target: programs.filter((program) => program.band === "target"),
    reach: programs.filter((program) => program.band === "reach"),
    "long-shot": programs.filter((program) => program.band === "long-shot"),
  };
}

function getRoundMeans(row: CollegePredictorIndexRow): (number | null)[] {
  return [
    row.round1_mean,
    row.round2_mean,
    row.round3_mean,
    row.round4_mean,
    row.round5_mean,
    row.round6_mean,
  ];
}

// P_cumulative_RN = 1 - Π(1 - P_i) for i=1..N, frozen after fill_round
export function computeRoundProbs(
  studentRank: number,
  row: CollegePredictorIndexRow,
): number[] {
  const roundMeans = getRoundMeans(row);
  const sigma = row.sigma_effective;
  const fillRound = row.fill_round;
  const result: number[] = [];
  let cumNotProb = 1;

  for (let r = 0; r < 6; r++) {
    const roundNum = r + 1;
    if (
      roundNum > fillRound ||
      roundMeans[r] === null ||
      roundMeans[r] === undefined
    ) {
      // after fill_round: freeze at last cumulative value
      const frozen = 1 - cumNotProb;
      result.push(Math.round(frozen * 10000) / 10000);
      continue;
    }

    const roundMean = roundMeans[r];
    if (roundMean === null || roundMean === undefined) continue;

    const roundProb = computeProbability(studentRank, roundMean, sigma);
    cumNotProb *= 1 - roundProb;
    result.push(Math.round((1 - cumNotProb) * 10000) / 10000);
  }

  return result;
}

// quality rank: pooled is worst, sufficient is best — used to find the floor across a result set
const DATA_QUALITY_RANK: Record<CollegePredictorIndexRow["data_quality"], number> = {
  sufficient: 0,
  inferred: 1,
  pooled: 2,
};

/**
 * derives response-level confidence from the worst data_quality present in the result set
 * "high" is never returned — reserved until backtesting proves the model is well-calibrated
 */
export function deriveConfidence(
  programs: ProgramPrediction[],
): { level: "medium" | "low"; caveat: string } {
  if (programs.length === 0) {
    return {
      level: "low",
      caveat: "no matching programs for this category, quota, and rank",
    };
  }

  let worstRank = 0;
  let worstQuality: CollegePredictorIndexRow["data_quality"] = "sufficient";
  for (const p of programs) {
    const rank = DATA_QUALITY_RANK[p.data_quality];
    if (rank > worstRank) {
      worstRank = rank;
      worstQuality = p.data_quality;
    }
  }

  if (worstQuality === "sufficient") {
    return {
      level: "medium",
      caveat: "probabilities are based on 3+ years of historical closing rank data",
    };
  }
  if (worstQuality === "inferred") {
    return {
      level: "low",
      caveat: "based on only 2 years of data — treat this prediction with caution",
    };
  }
  // pooled
  return {
    level: "low",
    caveat: "based on a single year of data — this prediction is highly uncertain",
  };
}

// index parquet uses JoSAA label "EWS"; callers may still send taxonomy alias "Gen-EWS"
function normalizeSeatTypeForIndex(seatType: string): string {
  return seatType === "Gen-EWS" ? "EWS" : seatType;
}

export function predictPrograms(opts: {
  indexRows: CollegePredictorIndexRow[];
  studentRank: number;
  seatType: string;
  quota?: string;
  gender: string;
  probabilityThreshold?: number;
  includeAll?: boolean;
  filters?: CollegePredictorFilters;
}): CollegePredictionResult {
  const threshold =
    opts.probabilityThreshold ?? DEFAULT_PROBABILITY_DISPLAY_THRESHOLD;
  const seatType = normalizeSeatTypeForIndex(opts.seatType);

  const matching = opts.indexRows.filter(
    (row) =>
      row.seat_type === seatType &&
      (opts.quota === undefined || row.quota === opts.quota) &&
      row.gender === opts.gender,
  );
  const filtered = applyCollegePredictorFilters(matching, opts.filters);

  const allPredictions: ProgramPrediction[] = [];

  for (const row of filtered) {
    const roundProbs = computeRoundProbs(opts.studentRank, row);
    const probability = roundProbs.at(-1) ?? 0;

    allPredictions.push({
      institute_id: row.institute_id,
      program_id: row.program_id,
      ...(row.program_name ? { program_name: row.program_name } : {}),
      seat_type: row.seat_type,
      quota: row.quota,
      gender: row.gender,
      instype: row.instype,
      ...(row.state ? { state: row.state } : {}),
      degree: row.degree,
      duration_years: row.duration_years,
      weighted_mean: row.weighted_mean,
      predicted_closing_rank: row.predicted_closing_rank,
      sigma_effective: row.sigma_effective,
      cumulative_probability: probability,
      band: classifyBand(probability),
      data_quality: row.data_quality,
      years_of_data: row.years_of_data,
      last_data_year: row.last_data_year,
      fill_round: row.fill_round,
      round_probs: roundProbs,
    });
  }

  const bandFiltered = opts.filters?.band?.length
    ? allPredictions.filter((program) =>
        opts.filters?.band?.includes(program.band),
      )
    : allPredictions;
  const predictions = opts.includeAll
    ? bandFiltered
    : bandFiltered.filter(
        (program) => program.cumulative_probability >= threshold,
      );

  // band first, then ascending predicted_closing_rank as a competitiveness proxy
  predictions.sort((a, b) => {
    if (a.band !== b.band) return BAND_ORDER[a.band] - BAND_ORDER[b.band];
    return a.predicted_closing_rank - b.predicted_closing_rank;
  });

  return {
    programs: predictions,
    metadata: {
      total_matching: bandFiltered.length,
      total_above_threshold: predictions.length,
      threshold_used: threshold,
      hidden_count: bandFiltered.length - predictions.length,
      total_matching_programs: bandFiltered.length,
      displayed_programs: predictions.length,
      hidden_programs: bandFiltered.length - predictions.length,
      active_filters: opts.filters ?? {},
    },
    grouped_by_band: groupProgramsByBand(predictions),
  };
}
