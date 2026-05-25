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
