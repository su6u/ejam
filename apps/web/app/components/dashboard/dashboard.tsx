/**
 * three-zone predictor workspace
 * setup inputs trigger a predict call; result filters are in-memory only
 **/

"use client";

import type { ProgramPrediction } from "@ejam/data/college-predictor";
import { useMemo, useState } from "react";
import { usePredictorQuery } from "../../../hooks/use-predictor-query";
import { usePredictorState } from "../../../hooks/use-predictor-state";
import { CollegeDetailSheet } from "./college-detail-sheet";
import { EmptyState, ErrorState, NoMatchesState } from "./empty-state";
import { PredictorPanel } from "./predictor-panel";
import { programKey, ResultsTable } from "./results-table";

export function Dashboard() {
  const state = usePredictorState();
  const [bandFilter, setBandFilter] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProgramPrediction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const query = usePredictorQuery({
    exam: state.exam,
    rank: state.rank,
    apiSeatType: state.apiSeatType,
    apiGender: state.apiGender,
    quota: state.quota,
    homeState: state.homeState,
    has_ews_certificate: state.has_ews_certificate,
    instituteTypeFilter: state.instituteTypeFilter,
    searchBranch: state.searchBranch,
  });

  const allPrograms = query.data?.programs ?? [];

  // in-memory refinement; predict-only filters are already applied server-side
  const visiblePrograms = useMemo(() => {
    const search = state.searchBranch.trim().toLowerCase();
    return allPrograms.filter((p) => {
      if (state.hideLongShot && p.band === "long-shot") return false;
      if (bandFilter.size > 0 && !bandFilter.has(p.band)) return false;
      if (
        state.instituteTypeFilter.size > 0 &&
        !state.instituteTypeFilter.has(p.instype)
      ) {
        return false;
      }
      if (search) {
        const name = (p.program_name ?? p.program_id).toLowerCase();
        if (!name.includes(search)) return false;
      }
      return true;
    });
  }, [
    allPrograms,
    bandFilter,
    state.hideLongShot,
    state.instituteTypeFilter,
    state.searchBranch,
  ]);

  const hasResults = allPrograms.length > 0;
  const selectedId = selected ? programKey(selected) : null;

  const middle = renderMiddle({
    isLoading: query.isLoading,
    error: query.error,
    hasResults,
    visible: visiblePrograms,
    hasRank: Boolean(state.rank),
    selectedId,
    onSelect: (p) => {
      setSelected(p);
      setSheetOpen(true);
    },
  });

  return (
    <div className="flex h-[calc(100dvh-72px)] w-full overflow-hidden border-t border-border">
      <PredictorPanel
        state={state}
        isLoading={query.isLoading}
        hasResults={hasResults}
        bandFilter={bandFilter}
        onBandFilterChange={setBandFilter}
        onPredict={query.trigger}
      />
      <main className="flex min-w-0 flex-1 flex-col">{middle}</main>

      <CollegeDetailSheet
        program={selected}
        open={sheetOpen}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) {
            // defer until after the close animation so the body doesn't blank mid-slide
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
  visible,
  hasRank,
  selectedId,
  onSelect,
}: {
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
  visible: ProgramPrediction[];
  hasRank: boolean;
  selectedId: string | null;
  onSelect: (p: ProgramPrediction) => void;
}) {
  if (error) return <ErrorState message={error} />;
  if (!hasResults) {
    if (isLoading) return <LoadingState />;
    return <EmptyState hasRank={hasRank} />;
  }
  if (visible.length === 0) return <NoMatchesState />;
  return (
    <ResultsTable rows={visible} selectedId={selectedId} onSelect={onSelect} />
  );
}

function LoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-4 size-5 animate-spin rounded-full border-2 border-border border-t-foreground"
          aria-hidden
        />
        <p className="text-[13px] text-muted-foreground">
          Generating predictions…
        </p>
      </div>
    </div>
  );
}
