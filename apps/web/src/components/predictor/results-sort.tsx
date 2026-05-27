"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { sortByBalancedScore } from "@ejam/data/college-predictor";
import { ArrowDownWideNarrow, Building2, Scale, Sparkles } from "lucide-react";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import { BAND_ORDER } from "@/lib/bands";

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
  { id: "closing-rank", label: "Closing rank", icon: ArrowDownWideNarrow },
  { id: "institute", label: "Institute", icon: Building2 },
];

export function applyResultsSort(
  programs: ProgramPrediction[],
  sortBy: ResultsSortKey,
): ProgramPrediction[] {
  const sorted = [...programs];

  switch (sortBy) {
    case "balanced":
      return sortByBalancedScore(sorted);
    case "closing-rank":
      sorted.sort(
        (a, b) => a.predicted_closing_rank - b.predicted_closing_rank,
      );
      break;
    case "institute":
      sorted.sort((a, b) => a.institute_id.localeCompare(b.institute_id));
      break;
    default:
      sorted.sort((a, b) => {
        if (a.band !== b.band) {
          return BAND_ORDER[a.band] - BAND_ORDER[b.band];
        }
        return a.predicted_closing_rank - b.predicted_closing_rank;
      });
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
