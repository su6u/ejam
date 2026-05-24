/**
 * Applies balanced ranking and best/stretch sections to a prediction result.
 */

import {
  applyBalancedRanking,
  branchFilterActive,
  splitBalancedSections,
  type InstituteRankingMeta,
} from "@ejam/data/college-predictor";
import type {
  CollegePredictionResult,
  CollegePredictorFilters,
  ProgramPrediction,
} from "@ejam/data/college-predictor";

export function finalizePredictionResult(
  result: CollegePredictionResult,
  filters: CollegePredictorFilters | undefined,
  instituteNirf: Map<string, number | null | undefined>,
): CollegePredictionResult {
  const instituteMeta = new Map<string, InstituteRankingMeta>();
  for (const [id, nirf] of instituteNirf) {
    instituteMeta.set(id, { nirf_rank: nirf });
  }

  const programs = applyBalancedRanking(result.programs, {
    instituteMeta,
    branchFilterActive: branchFilterActive(filters),
  });
  const { best_picks, stretch_picks } = splitBalancedSections(programs);

  return {
    ...result,
    programs,
    best_picks,
    stretch_picks,
  };
}

export function resultFromRankedPrograms(
  programs: ProgramPrediction[],
  filters: CollegePredictorFilters | undefined,
): CollegePredictionResult {
  const { best_picks, stretch_picks } = splitBalancedSections(programs);

  return {
    programs,
    best_picks,
    stretch_picks,
    metadata: {
      total_matching: programs.length,
      total_above_threshold: programs.length,
      threshold_used: 0.1,
      hidden_count: 0,
      total_matching_programs: programs.length,
      displayed_programs: programs.length,
      hidden_programs: 0,
      active_filters: filters ?? {},
    },
    grouped_by_band: {
      safe: programs.filter((p) => p.band === "safe"),
      target: programs.filter((p) => p.band === "target"),
      reach: programs.filter((p) => p.band === "reach"),
      "long-shot": programs.filter((p) => p.band === "long-shot"),
    },
  };
}
