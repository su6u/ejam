"use client";

import type {
  ProbabilityBand,
  ProgramPrediction,
} from "@ejam/data/college-predictor";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import { Separator } from "@/components/ui/separator";
import type { ExamType } from "@/hooks/use-predictor-state";
import { BAND_FILTER_OPTIONS } from "@/lib/bands";
import { cn } from "@/lib/utils";

export interface ResultsFilterState {
  instituteTypes: Set<string>;
  bands: Set<ProbabilityBand>;
}

export const EMPTY_RESULTS_FILTERS: ResultsFilterState = {
  instituteTypes: new Set(),
  bands: new Set(),
};

const JEE_MAIN_INSTITUTE_ORDER = ["NIT", "IIIT", "GFTI", "IIEST"] as const;

export function availableInstituteTypes(
  programs: ProgramPrediction[],
  exam: ExamType,
): string[] {
  if (exam !== "jee-main") return [];

  const present = new Set(programs.map((p) => p.instype));
  return JEE_MAIN_INSTITUTE_ORDER.filter((type) => present.has(type));
}

export function applyResultsFilters(
  programs: ProgramPrediction[],
  filters: ResultsFilterState,
): ProgramPrediction[] {
  return programs.filter((program) => {
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

export function hasActiveFilters(filters: ResultsFilterState): boolean {
  return filters.instituteTypes.size > 0 || filters.bands.size > 0;
}

interface ResultsFiltersProps {
  exam: ExamType;
  programs: ProgramPrediction[];
  filters: ResultsFilterState;
  onChange: (next: ResultsFilterState) => void;
  enabled: boolean;
}

export function ResultsFilters({
  exam,
  programs,
  filters,
  onChange,
  enabled,
}: ResultsFiltersProps) {
  const instituteTypes = availableInstituteTypes(programs, exam);
  const showInstituteGroup = exam === "jee-main" && instituteTypes.length > 0;

  function toggleInstitute(type: string) {
    const next = new Set(filters.instituteTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange({ ...filters, instituteTypes: next });
  }

  function toggleBand(band: ProbabilityBand) {
    const next = new Set(filters.bands);
    if (next.has(band)) next.delete(band);
    else next.add(band);
    onChange({ ...filters, bands: next });
  }

  const instituteGroup = showInstituteGroup ? (
    <FilterGroup label="Institute" vertical grid={2}>
      {instituteTypes.map((type) => (
        <FilterChip
          key={type}
          label={type}
          active={filters.instituteTypes.has(type)}
          disabled={!enabled}
          fullWidth
          onClick={() => toggleInstitute(type)}
        />
      ))}
    </FilterGroup>
  ) : null;

  const chanceGroup = (
    <FilterGroup label="Chance" vertical grid={2}>
      {BAND_FILTER_OPTIONS.map(({ id, label, icon, color }) => (
        <FilterChip
          key={id}
          label={label}
          icon={icon}
          active={filters.bands.has(id)}
          disabled={!enabled}
          fullWidth
          accentColor={color}
          onClick={() => toggleBand(id)}
        />
      ))}
    </FilterGroup>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        !enabled && "pointer-events-none opacity-50",
      )}
      aria-disabled={!enabled}
    >
      {instituteGroup}
      {showInstituteGroup ? <Separator /> : null}
      {chanceGroup}
    </div>
  );
}
