"use client";

import type {
  ProbabilityBand,
  ProgramPrediction,
} from "@ejam/data/college-predictor";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import type { ResultsFilterState } from "@/components/predictor/results-filter-logic";
import type { ExamType } from "@/hooks/use-predictor-state";
import { isJeeMainCounselling } from "@/hooks/use-predictor-state";
import { BAND_FILTER_OPTIONS } from "@/lib/bands";
import { cn } from "@/lib/utils";

const JEE_MAIN_INSTITUTE_ORDER = ["NIT", "IIIT", "CFI"] as const;

function singleActiveSlidingIndex<T>(
  items: readonly T[],
  isActive: (item: T) => boolean,
): number | null {
  let found = -1;
  let count = 0;

  for (let i = 0; i < items.length; i++) {
    if (!isActive(items[i])) continue;
    count += 1;
    found = i;
    if (count > 1) return null;
  }

  return count === 1 ? found : null;
}

function availableInstituteTypes(
  programs: ProgramPrediction[],
  exam: ExamType,
): string[] {
  if (!isJeeMainCounselling(exam)) return [];

  const present = new Set(programs.map((p) => p.instype));
  return JEE_MAIN_INSTITUTE_ORDER.filter((type) => present.has(type));
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
  const showInstituteGroup =
    isJeeMainCounselling(exam) && instituteTypes.length > 0;

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

  const instituteSlidingIndex = singleActiveSlidingIndex(
    instituteTypes,
    (type) => filters.instituteTypes.has(type),
  );
  const chanceSlidingIndex = singleActiveSlidingIndex(
    BAND_FILTER_OPTIONS,
    (option) => filters.bands.has(option.id),
  );

  const instituteGroup = showInstituteGroup ? (
    <FilterGroup
      label="Institute"
      iconSrc="/icons/filter.svg"
      vertical
      grid={2}
      slidingIndex={instituteSlidingIndex}
    >
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
    <FilterGroup
      label="Chance"
      vertical
      grid={2}
      slidingIndex={chanceSlidingIndex}
    >
      {BAND_FILTER_OPTIONS.map(({ id, label, color }) => (
        <FilterChip
          key={id}
          label={label}
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
      {chanceGroup}
    </div>
  );
}
