/**
 * API query hook for the JEE college predictor
 * calls POST /api/predict/{exam_id} and manages loading, error, and data state
 * results are session-cached keyed by a hash of the request body to avoid re-fetching on return visits
 **/

"use client";

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

interface PredictorQueryResult {
  data: CollegePredictionResult | null;
  isLoading: boolean;
  error: string | null;
  trigger: () => void;
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

  // JEE Main requires state for HS/OS quota resolution — send even when empty so schema validation
  // gives a clear field_error rather than a generic parse failure
  if (opts.exam === "jee-main") {
    body.state = opts.homeState;
  }

  return body;
}

// stable string key for sessionStorage caching
function cacheKey(opts: PredictorQueryOptions): string {
  const body = buildRequestBody(opts);
  return `predictor:${opts.exam}:${JSON.stringify(body)}`;
}

function readSessionCache(key: string): CollegePredictionResult | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CollegePredictionResult) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, data: CollegePredictionResult): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // sessionStorage quota exceeded — silently skip caching
  }
}

export function usePredictorQuery(
  opts: Readonly<PredictorQueryOptions>,
): PredictorQueryResult {
  const [data, setData] = useState<CollegePredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, [opts.exam]);

  const trigger = useCallback(async () => {
    if (!opts.rank || Number.isNaN(Number(opts.rank))) return;

    const key = cacheKey(opts);
    const cached = readSessionCache(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const examId = opts.exam === "jee-advanced" ? "jee-advanced" : "jee-main";
      const res = await fetch(`/api/predict/${examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(opts)),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        setError(`Prediction failed: ${text}`);
        return;
      }

      const json = (await res.json()) as { result: CollegePredictionResult };
      setData(json.result);
      writeSessionCache(key, json.result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error — please try again",
      );
    } finally {
      setIsLoading(false);
    }
  }, [opts]);

  return { data, isLoading, error, trigger };
}
