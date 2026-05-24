/**
 * Applies balanced ranking scores to a prediction result.
 */

import {
  applyBalancedRanking,
  branchFilterActive,
  groupProgramsByBand,
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
  return {
    ...result,
    programs,
    grouped_by_band: groupProgramsByBand(programs),
  };
}

export function resultFromRankedPrograms(
  programs: ProgramPrediction[],
  filters: CollegePredictorFilters | undefined,
): CollegePredictionResult {
  return {
    programs,
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
    grouped_by_band: groupProgramsByBand(programs),
  };
}
