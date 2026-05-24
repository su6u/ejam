/**
 * desktop predictor workspace — results table and selected-program drawer
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { useEffect, useState } from "react";
import { usePredictor } from "@/components/predictor/predictor-context";
import {
  applyResultsFilters,
  EMPTY_RESULTS_FILTERS,
} from "@/components/predictor/results-filters";
import {
  applyResultsSort,
  type ResultsSortKey,
} from "@/components/predictor/results-sort";
import { CollegeDetailSheet } from "./college-detail-sheet";
import { EmptyState, ErrorState, LoadingState } from "./empty-state";
import { programKey, ResultsTable } from "./results-table";

export function Dashboard() {
  const { state, query, filters, setFilters, sortBy, setSortBy } =
    usePredictor();
  const [selected, setSelected] = useState<ProgramPrediction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const programs = query.data?.programs ?? [];
  const hasResults = programs.length > 0;
  const filteredPrograms = applyResultsSort(
    applyResultsFilters(programs, filters),
    sortBy,
  );

  const selectedId = selected ? programKey(selected) : null;

  useEffect(() => {
    setSheetOpen(false);
    setSelected(null);
  }, [state.exam]);

  const middle = renderMiddle({
    isLoading: query.isLoading,
    error: query.error,
    hasResults,
    programs,
    filteredPrograms,
    sortBy,
    onSortChange: setSortBy,
    hasRank: Boolean(state.rank),
    selectedId,
    onSelect: (p) => {
      setSelected(p);
      setSheetOpen(true);
    },
    onClearFilters: () => setFilters(EMPTY_RESULTS_FILTERS),
  });

  return (
    <div className="h-[calc(100dvh-7rem)] overflow-visible bg-border p-px">
      <div className="h-full min-h-0 min-w-0 overflow-visible">{middle}</div>

      <CollegeDetailSheet
        program={selected}
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) {
            setTimeout(() => setSelected(null), 150);
          }
        }}
      />
    </div>
  );
}

function renderMiddle({
  isLoading,
  error,
  hasResults,
  programs,
  filteredPrograms,
  sortBy,
  onSortChange,
  hasRank,
  selectedId,
  onSelect,
  onClearFilters,
}: {
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
  programs: ProgramPrediction[];
  filteredPrograms: ProgramPrediction[];
  sortBy: ResultsSortKey;
  onSortChange: (next: ResultsSortKey) => void;
  hasRank: boolean;
  selectedId: string | null;
  onSelect: (p: ProgramPrediction) => void;
  onClearFilters: () => void;
}) {
  if (error) return <ErrorState message={error} />;
  if (!hasResults) {
    if (isLoading) return <LoadingState />;
    return <EmptyState hasRank={hasRank} />;
  }

  return (
    <ResultsTable
      rows={filteredPrograms}
      allRows={programs}
      sortBy={sortBy}
      onSortChange={onSortChange}
      selectedId={selectedId}
      onSelect={onSelect}
      onClearFilters={onClearFilters}
    />
  );
}
