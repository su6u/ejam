"use client";

import { FilterChip, FilterGroup } from "@/components/predictor/filter-chips";
import type { ResultsSortKey } from "@/components/predictor/results-sort-logic";

const SORT_OPTIONS: Array<{
  id: ResultsSortKey;
  label: string;
  iconSrc: string;
}> = [
  { id: "balanced", label: "Balanced", iconSrc: "/icons/balance.svg" },
  { id: "chance", label: "Best chance", iconSrc: "/icons/stars.svg" },
  { id: "closing-rank", label: "Closing rank", iconSrc: "/icons/rank.svg" },
  {
    id: "institute",
    label: "Alphabetical",
    iconSrc: "/icons/alphabetical-sorting.svg",
  },
];

interface ResultsSortProps {
  sortBy: ResultsSortKey;
  onChange: (next: ResultsSortKey) => void;
}

export function ResultsSort({ sortBy, onChange }: ResultsSortProps) {
  return (
    <FilterGroup label="Sort by">
      {SORT_OPTIONS.map(({ id, label, iconSrc }) => (
        <FilterChip
          key={id}
          label={label}
          iconSrc={iconSrc}
          active={sortBy === id}
          onClick={() => onChange(id)}
        />
      ))}
    </FilterGroup>
  );
}
