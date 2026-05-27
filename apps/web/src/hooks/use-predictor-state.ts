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

/** JoSAA / CSAB counselling body — only applies when exam is jee-main */
export type CounsellingBody = "josaa" | "csab";

export type PredictorExamId = "jee-main" | "jee-advanced" | "csab";

const COUNSELLING_BODIES = new Set<CounsellingBody>(["josaa", "csab"]);

export function parseCounsellingBody(raw: string | null): CounsellingBody {
  if (raw && COUNSELLING_BODIES.has(raw as CounsellingBody)) {
    return raw as CounsellingBody;
  }
  return "josaa";
}

export function counsellingToPredictorExam(
  exam: ExamType,
  counselling: CounsellingBody,
): PredictorExamId {
  if (exam === "jee-advanced") return "jee-advanced";
  if (counselling === "csab") return "csab";
  return "jee-main";
}

export function isJeeMainCounselling(exam: ExamType): boolean {
  return exam === "jee-main";
}

export function predictorUsesQuotaHomeState(
  predictorExamId: PredictorExamId,
): boolean {
  return predictorExamId === "jee-main" || predictorExamId === "csab";
}

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
  counselling: CounsellingBody;
  category: string;
  gender: string;
  quota: string;
  homeState: string;
  has_ews_certificate: boolean;
}

export interface PredictorStateReturn extends PredictorInputState {
  setRank: (v: string) => void;
  setExam: (v: ExamType) => void;
  setCounselling: (v: CounsellingBody) => void;
  setCategory: (v: string) => void;
  setGender: (v: string) => void;
  setQuota: (v: string) => void;
  setHomeState: (v: string) => void;
  setHasEwsCertificate: (v: boolean) => void;
  apiSeatType: string;
  apiGender: string;
  predictorExamId: PredictorExamId;
}

export function usePredictorState(): PredictorStateReturn {
  const router = useRouter();
  const params = useSearchParams();

  const rank = params.get("rank") ?? "";
  const exam = (params.get("exam") as ExamType | null) ?? "jee-main";
  const counselling = parseCounsellingBody(params.get("counselling"));
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

      updateParam({
        exam: v,
        rank: null,
        category: null,
        gender: null,
        quota: null,
        state: null,
        counselling: null,
        ews: null,
      });
    },
    [exam, updateParam],
  );
  const setCounselling = useCallback(
    (v: CounsellingBody) => updateParam({ counselling: v }),
    [updateParam],
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
    counselling,
    category,
    gender,
    quota,
    homeState,
    has_ews_certificate,
    setRank,
    setExam,
    setCounselling,
    setCategory,
    setGender,
    setQuota,
    setHomeState,
    setHasEwsCertificate,
    apiSeatType: CATEGORY_TO_SEAT_TYPE[category] ?? "OPEN",
    apiGender: GENDER_TO_API[gender] ?? "Gender-Neutral",
    predictorExamId: counsellingToPredictorExam(exam, counselling),
  };
}
