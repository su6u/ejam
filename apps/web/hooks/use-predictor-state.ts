/**
 * central state for the JEE college predictor
 * prediction inputs live in URL search params for shareable links
 * UI-only state stays in local React state
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

// inlined — no dependency on UI components that don't exist yet
export type ExamType = "jee-advanced" | "jee-main";
export type SortBy = "probability" | "rank" | "name";

const CATEGORY_TO_SEAT_TYPE: Record<string, string> = {
  gen: "OPEN",
  "gen-ews": "Gen-EWS",
  "obc-ncl": "OBC-NCL",
  sc: "SC",
  st: "ST",
};

const GENDER_TO_API: Record<string, string> = {
  neutr  neutr  neutr  neutr  neutr  neutr  neutr   (including Supernumerary)",
};

export interface PredictorInputState {
  rank: string;
  exam: ExamType;
  category: string;
  gender: string;
  quota: string;
  homeState: string;
  ews: boolean;
}

export interface PredictorUiState {
  sidebarOpen: boolean;
  bandTab: number;
  sortBy: SortBy;
  searchBranch: string;
  hideLongShot: boolean;
  expandedRowId: string | null;
  instituteTypeFilter: Set<string>;
}

export interface PredictorStateReturn
  extends PredictorInputState,
    PredictorUiState {
  setRank: (v: string) => void;
  setExam: (v: ExamType) => void;
  setCategory: (v: string) => void;
  setGender: (v: string) => void;
  setQuota: (v: string) => void;
  setHomeState: (v: string) => void;
  setEws: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setBandTab: (v: number) => void;
  setSortBy: (v: SortBy) => void;
  setSearchBranch: (v: string) => void;
  setHideLongShot: (v: boolean) => void;
  setExpandedRowId: (v: string | null) => void;
  toggleInstituteType: (t: string) => void;
  apiSeatType: string;
  apiGender: string;
}

export function usePredictorState(): PredictorStateReturn {
  const router = useRouter();
  const params = useSearchParams();

  const rank = params.get("rank") ?? "";
  const exam = (params.get("exam") as ExamType | null) ?? "jee-advanced";
  const category = params.get("category") ?? "gen";
  const gender = params.get("gender") ?? "neutral";
  const quota = params.get("quota") ?? "os";
  const homeState = params.get("state") ?? "";
  const ews = params.get("ews") === "true";

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const setRank = useCallback((v: string) => updateParam({ rank: v }), [updateParam]);
  const setExam = useCallback((v: ExamType) => updateParam({ exam: v }), [updateParam]);
  const setCategory = useCallback((v: string) => updateParam({ category: v }), [updateParam]);
  const setGender = useCallback((v: string) => updateParam({ gender: v }), [updateParam]);
  const setQuota = useCallback((v: string) => updateParam({ quota: v }), [updateParam]);
  const setEws = useCallback((v: boolean) => updateParam({ ews: v ? "true" : null }), [updateParam]);

  const setHomeState = useCallback(
    (v: string) => {
      if (exam === "jee-main" && quota === "hs") {
        updateParam({ state: v });
      } else {
        updateParam({ state: null });
      }
    },
    [exam, quota, updateParam],
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bandTab, setBandTab] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("probability");
  const [searchBranch, setSearchBranch] = useState("");
  const [hideLongShot, setHideLongShot] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [instituteTypeFilter, setInstituteTypeFilter] = useState<Set<string>>(new Set());

  const toggleInstituteType = useCallback((t: string) => {
    setInstituteTypeFilter((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }, []);

  return {
    rank, exam, category, gender, quota, homeState, ews,
    setRank, setExam, setCategory, setGender, setQuota, setHomeState, setEws,
    sidebarOpen, bandTab, sortBy, searchBranch, hideLongShot, expandedRowId, instituteTypeFilter,
    setSidebarOpen, setBandTab, setSortBy, setSearchBranch, setHideLongShot, setExpandedRowId, toggleInstituteType,
    apiSeatType: CATEGORY_TO_SEAT_TYPE[category] ?? "OPEN",
    apiGender: GENDER_TO_API[gender] ?? "Gender-Neutral",
  };
}
