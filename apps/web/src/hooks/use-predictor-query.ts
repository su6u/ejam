/**
 * API query hook for the JEE college predictor
 * calls POST /api/predict/{exam_id} and manages loading, error, and data state
 * results are session-cached keyed by index sha and request body
 **/

"use client";

import type {
  PredictionErrorResponse,
  PredictionProvenance,
  PredictionSuccessResponse,
} from "@ejam/data";
import type { CollegePredictionResult } from "@ejam/data/college-predictor";
import { useCallback, useEffect, useState } from "react";
import { uiQuotaToApi } from "@/predictors/shared/quota-input";

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
  confidence?: PredictionSuccessResponse["confidence"];
};

interface PredictorQueryResult {
  data: CollegePredictionResult | null;
  provenance: PredictionProvenance | null;
  confidence: PredictionSuccessResponse["confidence"] | null;
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
    return sessionStorage.getItem(`predictor:index-sha:${examToApiId(exam)}`) ?? "";
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
  const [confidence, setConfidence] = useState<
    PredictionSuccessResponse["confidence"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setProvenance(null);
    setConfidence(null);
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

  const trigger = useCallback(async (rankOverride?: string): Promise<boolean> => {
    const effectiveRank = rankOverride ?? rank;
    if (!effectiveRank || Number.isNaN(Number(effectiveRank))) return false;

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
    const key = cacheKey(opts, indexSha);
    const cached = readSessionCache(key);
    if (cached) {
      setData(cached.result);
      setProvenance(cached.provenance);
      setConfidence(cached.confidence ?? null);
      setError(null);
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      const examId = examToApiId(exam);
      const res = await fetch(`/api/predict/${examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(opts)),
      });

      const json = (await res.json()) as
        | PredictionSuccessResponse
        | PredictionErrorResponse;

      if (!res.ok || !json.ok) {
        const message = json.ok
          ? "Prediction failed"
          : json.error.message;
        setError(message);
        return false;
      }

      const responseSha = indexShaFromProvenance(json.provenance);
      setData(json.result as CollegePredictionResult);
      setProvenance(json.provenance);
      setConfidence(json.confidence ?? null);
      if (responseSha) {
        writeKnownIndexSha(exam, responseSha);
        writeSessionCache(cacheKey(opts, responseSha), {
          result: json.result as CollegePredictionResult,
          provenance: json.provenance,
          confidence: json.confidence,
        });
      }
      return false;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error — please try again";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    exam,
    rank,
    apiSeatType,
    apiGender,
    quota,
    homeState,
    has_ews_certificate,
  ]);

  return { data, provenance, confidence, isLoading, error, trigger };
}
