import type {
  ProbabilityBand,
  ProgramPrediction,
} from "@ejam/data/college-predictor";

export interface ResultsFilterState {
  instituteTypes: Set<string>;
  bands: Set<ProbabilityBand>;
}

export const EMPTY_RESULTS_FILTERS: ResultsFilterState = {
  instituteTypes: new Set(),
  bands: new Set(),
};

export function applyResultsFilters(
  programs: ProgramPrediction[],
  filters: ResultsFilterState,
  includeAll: boolean = true,
): ProgramPrediction[] {
  return programs.filter((program) => {
    if (!includeAll && program.band === "doesnt-matter") {
      return false;
    }
    if (
      filters.instituteTypes.size > 0 &&
      !filters.instituteTypes.has(program.instype)
    ) {
      return false;
    }
    if (filters.bands.size > 0 && !filters.bands.has(program.band)) {
      return false;
    }
    return true;
  });
}
