"use client";

import { createContext, useContext } from "react";
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

  return (
    <PredictorContext.Provider
      value={{ state, query, onPredict: query.trigger }}
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
