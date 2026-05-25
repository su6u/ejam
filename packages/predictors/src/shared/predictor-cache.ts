/**
 * shared server-side prediction cache entry shape
 * index sha is mixed into cache keys so rebuilt indexes invalidate stale rows
 */

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

export function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
