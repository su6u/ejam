"use client";

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
import { ArrowUpWideNarrow, Building2, Scale, Sparkles } from "lucide-react";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";

export type ResultsSortKey =
  | "balanced"
  | "chance"
  | "closing-rank"
  | "institute";

export const DEFAULT_RESULTS_SORT: ResultsSortKey = "balanced";

const SORT_OPTIONS: Array<{
  id: ResultsSortKey;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "balanced", label: "Balanced", icon: Scale },
  { id: "chance", label: "Best chance", icon: Sparkles },
  { id: "closing-rank", label: "Closing rank", icon: ArrowUpWideNarrow },
  { id: "institute", label: "Institute", icon: Building2 },
];

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

interface ResultsSortProps {
  sortBy: ResultsSortKey;
  onChange: (next: ResultsSortKey) => void;
}

export function ResultsSort({ sortBy, onChange }: ResultsSortProps) {
  return (
    <FilterGroup label="Sort by">
      {SORT_OPTIONS.map(({ id, label, icon }) => (
        <FilterChip
          key={id}
          label={label}
          icon={icon}
          active={sortBy === id}
          onClick={() => onChange(id)}
        />
      ))}
    </FilterGroup>
  );
}
