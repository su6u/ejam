/**
 * API query hook for the JEE college predictor
 * calls POST /api/predict/{exam_id} and manages loading, error, and data state
 * results are session-cached keyed by a hash of the request body to avoid re-fetching on return visits
 **/

"use client";

import type {
  PredictionProvenance,
  PredictionSuccessResponse,
} from "@ejam/data";
import type { CollegePredictionResult } from "@ejam/data/college-predictor";
import { useCallback, useEffect, useState } from "react";

interface PredictorQueryOptions {
  exam: string;
  rank: string;
  apiSeatType: string;
  apiGender: string;
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
  trigger: () => Promise<void>;
}

function examToApiId(exam: string): string {
  if (exam === "jee-advanced") return "jee-advanced";
  if (exam === "csab") return "csab";
  return "jee-main";
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
    body.state = opts.homeState;
  }

  return body;
}

function cacheKey(opts: PredictorQueryOptions): string {
  const body = buildRequestBody(opts);
  return `predictor:${examToApiId(opts.exam)}:${JSON.stringify(body)}`;
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

export function usePredictorQuery({
  exam,
  rank,
  apiSeatType,
  apiGender,
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
  }, [exam]);

  const trigger = useCallback(async () => {
    if (!rank || Number.isNaN(Number(rank))) return;

    const opts: PredictorQueryOptions = {
      exam,
      rank,
      apiSeatType,
      apiGender,
      homeState,
      has_ews_certificate,
    };
    const key = cacheKey(opts);
    const cached = readSessionCache(key);
    if (cached) {
      setData(cached.result);
      setProvenance(cached.provenance);
      setConfidence(cached.confidence ?? null);
      setError(null);
      return;
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

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        const message = `Prediction failed: ${text}`;
        setError(message);
        return;
      }

      const json = (await res.json()) as PredictionSuccessResponse;
      setData(json.result as CollegePredictionResult);
      setProvenance(json.provenance);
      setConfidence(json.confidence ?? null);
      writeSessionCache(key, {
        result: json.result as CollegePredictionResult,
        provenance: json.provenance,
        confidence: json.confidence,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error — please try again";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [exam, rank, apiSeatType, apiGender, homeState, has_ews_certificate]);

  return { data, provenance, confidence, isLoading, error, trigger };
}
