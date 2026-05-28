"use client";

import { ArrowUpWideNarrow, Building2, Scale, Sparkles } from "lucide-react";
import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import type { ResultsSortKey } from "@/components/predictor/results-sort-logic";

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
