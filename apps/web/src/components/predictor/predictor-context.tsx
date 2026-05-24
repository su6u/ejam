"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

type PredictorQueryReturn = ReturnType<typeof usePredictorQuery>;

interface PredictorContextValue {
  state: PredictorStateReturn;
  query: PredictorQueryReturn;
  onPredict: () => void;
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
    homeState: state.homeState,
    has_ews_certificate: state.has_ews_certificate,
  });
  const [filters, setFilters] =
    useState<ResultsFilterState>(EMPTY_RESULTS_FILTERS);
  const [sortBy, setSortBy] = useState<ResultsSortKey>(DEFAULT_RESULTS_SORT);
  const hasResults = (query.data?.programs.length ?? 0) > 0;

  useEffect(() => {
    setFilters(EMPTY_RESULTS_FILTERS);
    setSortBy(DEFAULT_RESULTS_SORT);
  }, [state.exam]);

  useEffect(() => {
    if (query.data) {
      setFilters(EMPTY_RESULTS_FILTERS);
      setSortBy(DEFAULT_RESULTS_SORT);
    }
  }, [query.data]);

  return (
    <PredictorContext.Provider
      value={{
        state,
        query,
        onPredict: query.trigger,
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
