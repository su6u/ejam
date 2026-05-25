/**
 * central state for the JEE college predictor
 * prediction inputs live in URL search params for shareable links
 *
 * the URL key for the EWS certificate flag is the short `ews` for compact links
 * the TypeScript field name is `has_ews_certificate` to reflect what the student is actually asserting
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type ExamType = "jee-advanced" | "jee-main";

const CATEGORY_TO_SEAT_TYPE: Record<string, string> = {
  gen: "OPEN",
  "gen-ews": "EWS",
  "obc-ncl": "OBC-NCL",
  sc: "SC",
  st: "ST",
};

const GENDER_TO_API: Record<string, string> = {
  neutral: "Gender-Neutral",
  female: "Female-only (including Supernumerary)",
};

export interface PredictorInputState {
  rank: string;
  exam: ExamType;
  category: string;
  gender: string;
  quota: string;
  homeState: string;
  has_ews_certificate: boolean;
}

export interface PredictorStateReturn extends PredictorInputState {
  setRank: (v: string) => void;
  setExam: (v: ExamType) => void;
  setCategory: (v: string) => void;
  setGender: (v: string) => void;
  setQuota: (v: string) => void;
  setHomeState: (v: string) => void;
  setHasEwsCertificate: (v: boolean) => void;
  apiSeatType: string;
  apiGender: string;
}

export function usePredictorState(): PredictorStateReturn {
  const router = useRouter();
  const params = useSearchParams();

  const rank = params.get("rank") ?? "";
  const exam = (params.get("exam") as ExamType | null) ?? "jee-main";
  const category = params.get("category") ?? "gen";
  const gender = params.get("gender") ?? "neutral";
  const quota = params.get("quota") ?? "os";
  const homeState = params.get("state") ?? "";
  const has_ews_certificate = params.get("ews") === "true";

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

  const setRank = useCallback(
    (v: string) => updateParam({ rank: v }),
    [updateParam],
  );
  const setExam = useCallback(
    (v: ExamType) => {
      if (v === exam) return;

      const updates: Record<string, string | null> = {
        exam: v,
        rank: null,
      };

      if (v === "jee-advanced") {
        updates.quota = null;
        updates.state = null;
      }

      updateParam(updates);
    },
    [exam, updateParam],
  );
  const setCategory = useCallback(
    (v: string) => updateParam({ category: v }),
    [updateParam],
  );
  const setGender = useCallback(
    (v: string) => updateParam({ gender: v }),
    [updateParam],
  );
  const setQuota = useCallback(
    (v: string) => updateParam({ quota: v }),
    [updateParam],
  );
  const setHasEwsCertificate = useCallback(
    (v: boolean) => updateParam({ ews: v ? "true" : null }),
    [updateParam],
  );

  const setHomeState = useCallback(
    (v: string) => updateParam({ state: v }),
    [updateParam],
  );

  return {
    rank,
    exam,
    category,
    gender,
    quota,
    homeState,
    has_ews_certificate,
    setRank,
    setExam,
    setCategory,
    setGender,
    setQuota,
    setHomeState,
    setHasEwsCertificate,
    apiSeatType: CATEGORY_TO_SEAT_TYPE[category] ?? "OPEN",
    apiGender: GENDER_TO_API[gender] ?? "Gender-Neutral",
  };
}
