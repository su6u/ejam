/**
 * API query hook for the JEE college predictor
 * calls POST /api/predict/{exam_id} and manages loading, error, and data state
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
import type { PredictorExamId } from "@/hooks/use-predictor-state";
import { predictorUsesQuotaHomeState } from "@/hooks/use-predictor-state";

interface PredictorQueryOptions {
  predictorExamId: PredictorExamId;
  rank: string;
  apiSeatType: string;
  apiGender: string;
  quota: string;
  homeState: string;
  has_ews_certificate: boolean;
}

interface PredictorQueryResult {
  data: CollegePredictionResult | null;
  provenance: PredictionProvenance | null;
  isLoading: boolean;
  error: string | null;
  trigger: (rankOverride?: string) => Promise<boolean>;
}

function examToApiId(predictorExamId: PredictorExamId): string {
  return predictorExamId;
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

  if (predictorUsesQuotaHomeState(opts.predictorExamId)) {
    body.quota = uiQuotaToApi(opts.quota);
    body.state = opts.homeState;
  }

  return body;
}

function requestInputKey(opts: PredictorQueryOptions): string {
  return JSON.stringify([
    examToApiId(opts.predictorExamId),
    opts.rank,
    opts.apiSeatType,
    opts.apiGender,
    opts.quota,
    opts.homeState,
    opts.has_ews_certificate,
  ]);
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
  predictorExamId,
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
  const predictInFlightInputKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const currentInputKey = requestInputKey({
      predictorExamId,
      rank,
      apiSeatType,
      apiGender,
      quota,
      homeState,
      has_ews_certificate,
    });
    if (
      predictInFlightInputKeyRef.current !== null &&
      predictInFlightInputKeyRef.current === currentInputKey
    ) {
      return;
    }
    requestGenerationRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    predictInFlightInputKeyRef.current = null;
    setData(null);
    setProvenance(null);
    setError(null);
    setIsLoading(false);
  }, [
    predictorExamId,
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

      const generation = ++requestGenerationRef.current;
      const isCurrent = () => generation === requestGenerationRef.current;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const opts: PredictorQueryOptions = {
        predictorExamId,
        rank: effectiveRank,
        apiSeatType,
        apiGender,
        quota,
        homeState,
        has_ews_certificate,
      };
      const inputKey = requestInputKey(opts);
      predictInFlightInputKeyRef.current = inputKey;

      if (!isCurrent()) return false;
      setIsLoading(true);
      setError(null);

      try {
        const examId = examToApiId(predictorExamId);
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

        setData(json.result as CollegePredictionResult);
        setProvenance(json.provenance);
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
        if (predictInFlightInputKeyRef.current === inputKey) {
          predictInFlightInputKeyRef.current = null;
        }
        if (isCurrent()) {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [
      predictorExamId,
      rank,
      apiSeatType,
      apiGender,
      quota,
      homeState,
      has_ews_certificate,
    ],
  );

  return { data, provenance, isLoading, error, trigger };
}
