/**
 * desktop predictor workspace — results table and selected-program drawer
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { useEffect, useState } from "react";
import {
  countClientHiddenLongShots,
  hasOnlyClientHiddenLongShots,
  withClientHiddenLongShotMetadata,
} from "@/components/predictor/long-shot-visibility";
import { usePredictor } from "@/components/predictor/predictor-context";
import { programKey } from "@/components/predictor/program-key";
import {
  applyResultsFilters,
  EMPTY_RESULTS_FILTERS,
} from "@/components/predictor/results-filter-logic";
import { applyResultsSearch } from "@/components/predictor/results-search-logic";
import {
  applyResultsSort,
  type ResultsSortKey,
} from "@/components/predictor/results-sort-logic";
import { CollegeDetailSheet } from "./college-detail-sheet";
import { EmptyState, ErrorState, LoadingState } from "./empty-state";
import { ResultsTable } from "./results-table";

export function Dashboard() {
  const {
    state,
    query,
    rankInputRef,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
  } = usePredictor();
  const [selected, setSelected] = useState<ProgramPrediction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const programs = query.data?.programs ?? [];
  const clientHiddenLongShots = countClientHiddenLongShots(
    programs,
    state.include_all,
  );
  const hasResults =
    programs.length > 0 &&
    !hasOnlyClientHiddenLongShots(programs, state.include_all);
  const metadata = withClientHiddenLongShotMetadata(
    query.data?.metadata,
    clientHiddenLongShots,
  );
  const filteredPrograms = applyResultsSort(
    applyResultsSearch(
      applyResultsFilters(programs, filters, state.include_all),
      searchQuery,
    ),
    sortBy,
    query.data?.metadata.active_filters,
  );

  const selectedId = selected ? programKey(selected) : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset drawer when exam or counselling changes
  useEffect(() => {
    setSheetOpen(false);
    setSelected(null);
  }, [state.exam, state.counselling]);

  const middle = renderMiddle({
    isLoading: query.isLoading,
    error: query.error,
    hasResults,
    hasPredicted: query.data !== null,
    metadata,
    includeAll: state.include_all,
    onShowLongShots: () => {
      state.setIncludeAll(true);
      const flushedRank = rankInputRef.current?.flush() ?? state.rank;
      void query.trigger(flushedRank, { include_all: true });
    },
    programs,
    filteredPrograms,
    sortBy,
    onSortChange: setSortBy,
    searchQuery,
    onSearchChange: setSearchQuery,
    selectedId,
    provenance: query.provenance,
    onSelect: (p) => {
      setSelected(p);
      setSheetOpen(true);
    },
    onClearFilters: () => {
      setFilters(EMPTY_RESULTS_FILTERS);
      setSearchQuery("");
    },
  });

  return (
    <div className="h-[calc(100dvh-7rem)] min-h-0 w-full min-w-0 bg-border p-px">
      <div className="h-full min-h-0 min-w-0">{middle}</div>

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
  hasPredicted,
  metadata,
  includeAll,
  onShowLongShots,
  programs,
  filteredPrograms,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  selectedId,
  provenance,
  onSelect,
  onClearFilters,
}: {
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
  hasPredicted: boolean;
  metadata?: import("@ejam/data/college-predictor").CollegePredictionResult["metadata"];
  includeAll: boolean;
  onShowLongShots: () => void;
  programs: ProgramPrediction[];
  filteredPrograms: ProgramPrediction[];
  sortBy: ResultsSortKey;
  onSortChange: (next: ResultsSortKey) => void;
  searchQuery: string;
  onSearchChange: (next: string) => void;
  selectedId: string | null;
  provenance: import("@ejam/data").PredictionProvenance | null;
  onSelect: (p: ProgramPrediction) => void;
  onClearFilters: () => void;
}) {
  if (error) return <ErrorState message={error} provenance={provenance} />;
  if (!hasResults) {
    if (isLoading) return <LoadingState provenance={provenance} />;
    return (
      <EmptyState
        hasPredicted={hasPredicted}
        metadata={metadata}
        includeAll={includeAll}
        onShowLongShots={onShowLongShots}
        provenance={provenance}
      />
    );
  }

  return (
    <ResultsTable
      rows={filteredPrograms}
      allRows={programs}
      sortBy={sortBy}
      onSortChange={onSortChange}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      selectedId={selectedId}
      onSelect={onSelect}
      onClearFilters={onClearFilters}
      provenance={provenance}
    />
  );
}
