/**
 * shared server-side prediction cache entry shape
 * index sha is mixed into cache keys so rebuilt indexes invalidate stale rows
 */

import { createHash } from "node:crypto";

import type {
  CollegePredictionResult,
  ProgramPrediction,
} from "@ejam/data/college-predictor";

export type ServerCacheEntry = {
  programs: ProgramPrediction[];
  metadata: CollegePredictionResult["metadata"];
  ews_comparison?: CollegePredictionResult["ews_comparison"];
};

export function indexShaFromDeps(deps: {
  resolvedDatasets: Array<{ dataset: string; sha256: string }>;
}): string {
  return (
    deps.resolvedDatasets.find((d) => d.dataset === "predictor_index")
      ?.sha256 ?? ""
  );
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableNormalize(entry)]),
    );
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

export function createServerCacheKey(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
