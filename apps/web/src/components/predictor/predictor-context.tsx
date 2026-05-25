"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  EMPTY_RESULTS_FILTERS,
  type ResultsFilterState,
} from "@/components/predictor/results-filters";
import {
  DEFAULT_RESULTS_SORT,
  type ResultsSortKey,
} from "@/components/predictor/results-sort";
import { usePredictorQuery } from "@/hooks/use-predictor-query";
import {
  type PredictorStateReturn,
  usePredictorState,
} from "@/hooks/use-predictor-state";
import type { RankInputHandle } from "@/components/predictor/rank-input";

type PredictorQueryReturn = ReturnType<typeof usePredictorQuery>;

interface PredictorContextValue {
  state: PredictorStateReturn;
  query: PredictorQueryReturn;
  onPredict: () => void;
  rankInputRef: React.RefObject<RankInputHandle | null>;
  filters: ResultsFilterState;
  setFilters: (next: ResultsFilterState) => void;
  sortBy: ResultsSortKey;
  setSortBy: (next: ResultsSortKey) => void;
  hasResults: boolean;
}

const PredictorContext = createContext<PredictorContextValue | null>(null);

export function PredictorProvider({ children }: { children: React.ReactNode }) {
  const state = usePredictorState();
  const query = usePredictorQuery({
    exam: state.exam,
    rank: state.rank,
    apiSeatType: state.apiSeatType,
    apiGender: state.apiGender,
    quota: state.quota,
    homeState: state.homeState,
    has_ews_certificate: state.has_ews_certificate,
  });
  const [filters, setFilters] =
    useState<ResultsFilterState>(EMPTY_RESULTS_FILTERS);
  const [sortBy, setSortBy] = useState<ResultsSortKey>(DEFAULT_RESULTS_SORT);
  const rankInputRef = useRef<RankInputHandle>(null);
  const initialPredictStarted = useRef(false);
  const hasResults = (query.data?.programs.length ?? 0) > 0;

  useEffect(() => {
    setFilters(EMPTY_RESULTS_FILTERS);
    setSortBy(DEFAULT_RESULTS_SORT);
  }, [state.exam]);

  const onPredict = useCallback(async () => {
    const flushedRank = rankInputRef.current?.flush() ?? state.rank;
    const fromCache = await query.trigger(flushedRank);
    if (!fromCache) {
      setFilters(EMPTY_RESULTS_FILTERS);
      setSortBy(DEFAULT_RESULTS_SORT);
    }
  }, [query, state.rank]);

  useEffect(() => {
    if (initialPredictStarted.current || !state.rank.trim()) return;

    const needsHomeState =
      state.exam === "jee-main" &&
      (state.quota === "hs" || state.quota === "os");
    if (needsHomeState && !state.homeState.trim()) return;

    initialPredictStarted.current = true;
    void onPredict();
  }, [
    state.rank,
    state.exam,
    state.quota,
    state.homeState,
    onPredict,
  ]);

  return (
    <PredictorContext.Provider
      value={{
        state,
        query,
        onPredict,
        rankInputRef,
        filters,
        setFilters,
        sortBy,
        setSortBy,
        hasResults,
      }}
    >
      {children}
    </PredictorContext.Provider>
  );
}

export function usePredictor(): PredictorContextValue {
  const ctx = useContext(PredictorContext);
  if (!ctx) {
    throw new Error("usePredictor must be used within PredictorProvider");
  }
  return ctx;
}
