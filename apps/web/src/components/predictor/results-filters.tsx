"use client";

import type {
  ProbabilityBand,
  ProgramPrediction,
} from "@ejam/data/college-predictor";
import {
  Shield,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import type { ExamType } from "@/hooks/use-predictor-state";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface ResultsFilterState {
  instituteTypes: Set<string>;
  bands: Set<ProbabilityBand>;
}

export const EMPTY_RESULTS_FILTERS: ResultsFilterState = {
  instituteTypes: new Set(),
  bands: new Set(),
};

const BAND_OPTIONS: Array<{
  id: ProbabilityBand;
  label: string;
  icon: LucideIcon;
  color: string;
}> = [
  { id: "safe", label: "Safe", icon: Shield, color: "#00D5BE" },
  { id: "target", label: "Target", icon: Target, color: "#52A2FF" },
  { id: "reach", label: "Reach", icon: TrendingUp, color: "#FEB903" },
  { id: "long-shot", label: "Long-shot", icon: Zap, color: "#FF6467" },
];

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

interface ResultsFiltersProps {
  exam: ExamType;
  programs: ProgramPrediction[];
  filters: ResultsFilterState;
  onChange: (next: ResultsFilterState) => void;
  enabled: boolean;
  variant?: "inline" | "sidebar";
}

export function ResultsFilters({
  exam,
  programs,
  filters,
  onChange,
  enabled,
  variant = "inline",
}: ResultsFiltersProps) {
  const instituteTypes = availableInstituteTypes(programs, exam);
  const showInstituteGroup = exam === "jee-main" && instituteTypes.length > 0;
  const isSidebar = variant === "sidebar";

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
    <FilterGroup label="Institute" vertical={isSidebar} grid={isSidebar ? 2 : undefined}>
      {instituteTypes.map((type) => (
          <FilterChip
            key={type}
            label={type}
            active={filters.instituteTypes.has(type)}
            disabled={!enabled}
            fullWidth={isSidebar}
            onClick={() => toggleInstitute(type)}
          />
        ))}
    </FilterGroup>
  ) : null;

  const chanceGroup = (
    <FilterGroup label="Chance" vertical={isSidebar} grid={isSidebar ? 2 : undefined}>
      {BAND_OPTIONS.map(({ id, label, icon, color }) => (
        <FilterChip
          key={id}
          label={label}
          icon={icon}
          active={filters.bands.has(id)}
          disabled={!enabled}
          fullWidth={isSidebar}
          accentColor={color}
          onClick={() => toggleBand(id)}
        />
      ))}
    </FilterGroup>
  );

  if (isSidebar) {
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

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        !enabled && "pointer-events-none opacity-40",
      )}
      aria-disabled={!enabled}
    >
      {instituteGroup}
      {showInstituteGroup ? (
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
      ) : null}
      {chanceGroup}
    </div>
  );
}
