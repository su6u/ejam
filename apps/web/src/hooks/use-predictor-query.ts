/**
 * API query hook for the JEE college predictor
 * calls POST /api/predict/{exam_id} and manages loading, error, and data state
 * results are session-cached keyed by index sha and request body
 **/

"use client";

import {
  PredictionErrorResponse,
  type PredictionProvenance,
  PredictionSuccessResponse,
} from "@ejam/data";
import type { CollegePredictionResult } from "@ejam/data/college-predictor";
import { uiQuotaToApi } from "@ejam/predictors/shared/quota-input";
import { useCallback, useEffect, useRef, useState } from "react";

interface PredictorQueryOptions {
  exam: string;
  rank: string;
  apiSeatType: string;
  apiGender: string;
  quota: string;
  homeState: string;
  has_ews_certificate: boolean;
}

type CachedPrediction = {
  result: CollegePredictionResult;
  provenance: PredictionProvenance;
};

interface PredictorQueryResult {
  data: CollegePredictionResult | null;
  provenance: PredictionProvenance | null;
  isLoading: boolean;
  error: string | null;
  trigger: (rankOverride?: string) => Promise<boolean>;
}

function examToApiId(exam: string): string {
  if (exam === "jee-advanced") return "jee-advanced";
  if (exam === "csab") return "csab";
  return "jee-main";
}

function indexShaFromProvenance(
  provenance: PredictionProvenance | null,
): string {
  return (
    provenance?.datasets_used.find((d) => d.dataset === "predictor_index")
      ?.sha256 ?? ""
  );
}

function buildRequestBody(
  opts: PredictorQueryOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    rank: Number.parseInt(opts.rank, 10),
    seat_type: opts.apiSeatType,
    gender: opts.apiGender,
    has_ews_certificate: opts.has_ews_certificate,
  };

  if (opts.exam === "jee-main" || opts.exam === "csab") {
    body.quota = uiQuotaToApi(opts.quota);
    body.state = opts.homeState;
  }

  return body;
}

function cacheKey(opts: PredictorQueryOptions, indexSha: string): string {
  const body = buildRequestBody(opts);
  return `predictor:${examToApiId(opts.exam)}:${indexSha}:${JSON.stringify(body)}`;
}

function readSessionCache(key: string): CachedPrediction | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CachedPrediction) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, data: CachedPrediction): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // sessionStorage quota exceeded — silently skip caching
  }
}

function readKnownIndexSha(exam: string): string {
  try {
    return (
      sessionStorage.getItem(`predictor:index-sha:${examToApiId(exam)}`) ?? ""
    );
  } catch {
    return "";
  }
}

function writeKnownIndexSha(exam: string, sha: string): void {
  try {
    sessionStorage.setItem(`predictor:index-sha:${examToApiId(exam)}`, sha);
  } catch {
    // ignore quota errors
  }
}

function clearExamPredictorCache(exam: string): void {
  const examId = examToApiId(exam);
  try {
    const prefix = `predictor:${examId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) sessionStorage.removeItem(key);
    sessionStorage.removeItem(`predictor:index-sha:${examId}`);
  } catch {
    // ignore quota errors
  }
}

function readErrorMessage(body: unknown): string {
  const parsed = PredictionErrorResponse.safeParse(body);
  return parsed.success ? parsed.data.error.message : "Prediction failed";
}

function readSuccessResponse(body: unknown): PredictionSuccessResponse | null {
  const parsed = PredictionSuccessResponse.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export function usePredictorQuery({
  exam,
  rank,
  apiSeatType,
  apiGender,
  quota,
  homeState,
  has_ews_certificate,
}: Readonly<PredictorQueryOptions>): PredictorQueryResult {
  const [data, setData] = useState<CollegePredictionResult | null>(null);
  const [provenance, setProvenance] = useState<PredictionProvenance | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const predictInFlightRankRef = useRef<string | null>(null);
  // first predict per exam per page load hits the API so a deploy cannot serve stale sessionStorage
  const sessionCacheReadyRef = useRef<Record<string, boolean>>({});

  // biome-ignore lint/correctness/useExhaustiveDependencies: flush stale results when inputs change
  useEffect(() => {
    if (
      predictInFlightRankRef.current !== null &&
      predictInFlightRankRef.current === rank
    ) {
      return;
    }
    requestGenerationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setData(null);
    setProvenance(null);
    setError(null);
    setIsLoading(false);
  }, [
    exam,
    rank,
    apiSeatType,
    apiGender,
    quota,
    homeState,
    has_ews_certificate,
  ]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const trigger = useCallback(
    async (rankOverride?: string): Promise<boolean> => {
      const effectiveRank = rankOverride ?? rank;
      if (!effectiveRank || Number.isNaN(Number(effectiveRank))) return false;

      predictInFlightRankRef.current = effectiveRank;
      const generation = ++requestGenerationRef.current;
      const isCurrent = () => generation === requestGenerationRef.current;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const opts: PredictorQueryOptions = {
        exam,
        rank: effectiveRank,
        apiSeatType,
        apiGender,
        quota,
        homeState,
        has_ews_certificate,
      };
      const indexSha = readKnownIndexSha(exam);
      const examId = examToApiId(exam);
      const canUseSessionCache = sessionCacheReadyRef.current[examId] === true;

      if (canUseSessionCache && indexSha) {
        const key = cacheKey(opts, indexSha);
        const cached = readSessionCache(key);
        if (cached) {
          if (!isCurrent()) return false;
          setData(cached.result);
          setProvenance(cached.provenance);
          setError(null);
          abortControllerRef.current = null;
          return true;
        }
      }

      if (!isCurrent()) return false;
      setIsLoading(true);
      setError(null);

      try {
        const examId = examToApiId(exam);
        const res = await fetch(`/api/predict/${examId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody(opts)),
          signal: controller.signal,
        });

        if (!isCurrent()) return false;

        let body: unknown;
        try {
          body = await res.json();
        } catch {
          if (!isCurrent()) return false;
          setError("Network error — please try again");
          return false;
        }

        if (!isCurrent()) return false;

        if (
          !res.ok ||
          (body !== null &&
            typeof body === "object" &&
            "ok" in body &&
            body.ok === false)
        ) {
          setError(readErrorMessage(body));
          return false;
        }

        const json = readSuccessResponse(body);
        if (!json) {
          setError("Prediction failed");
          return false;
        }

        const responseSha = indexShaFromProvenance(json.provenance);
        const previousSha = readKnownIndexSha(exam);
        if (responseSha && previousSha && responseSha !== previousSha) {
          clearExamPredictorCache(exam);
        }
        setData(json.result as CollegePredictionResult);
        setProvenance(json.provenance);
        if (responseSha) {
          writeKnownIndexSha(exam, responseSha);
          writeSessionCache(cacheKey(opts, responseSha), {
            result: json.result as CollegePredictionResult,
            provenance: json.provenance,
          });
          sessionCacheReadyRef.current[examId] = true;
        }
        return false;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return false;
        if (!isCurrent()) return false;
        const message =
          err instanceof Error
            ? err.message
            : "Network error — please try again";
        setError(message);
        return false;
      } finally {
        if (predictInFlightRankRef.current === effectiveRank) {
          predictInFlightRankRef.current = null;
        }
        if (isCurrent()) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [exam, rank, apiSeatType, apiGender, quota, homeState, has_ews_certificate],
  );

  return { data, provenance, isLoading, error, trigger };
}
