import type {
  CollegePredictorFilters,
  ProgramPrediction,
} from "@ejam/data/college-predictor";
import {
  applyBalancedRanking,
  branchFilterActive,
  instituteMetaFromPrograms,
  sortByChance,
  sortByClosingRank,
} from "@ejam/data/college-predictor";

export type ResultsSortKey =
  | "balanced"
  | "chance"
  | "closing-rank"
  | "institute";

export const DEFAULT_RESULTS_SORT: ResultsSortKey = "balanced";

export function applyResultsSort(
  programs: ProgramPrediction[],
  sortBy: ResultsSortKey,
  apiFilters?: CollegePredictorFilters,
): ProgramPrediction[] {
  const sorted = [...programs];

  switch (sortBy) {
    case "balanced":
      return applyBalancedRanking(sorted, {
        instituteMeta: instituteMetaFromPrograms(sorted),
        branchFilterActive: branchFilterActive(apiFilters),
      });
    case "closing-rank":
      return sortByClosingRank(sorted);
    case "institute":
      sorted.sort((a, b) => {
        let cmp = a.institute_id.localeCompare(b.institute_id);
        if (cmp !== 0) return cmp;
        cmp = a.program_id.localeCompare(b.program_id);
        if (cmp !== 0) return cmp;
        cmp = a.seat_type.localeCompare(b.seat_type);
        if (cmp !== 0) return cmp;
        cmp = a.quota.localeCompare(b.quota);
        if (cmp !== 0) return cmp;
        return a.gender.localeCompare(b.gender);
      });
      break;
    case "chance":
      return sortByChance(sorted);
  }

  return sorted;
}
