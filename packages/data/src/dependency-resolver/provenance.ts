/**
 * builds honest prediction provenance — only predictor_index is loaded at request time
 * cutoff files consumed at index build appear as linked entries via the lineage sidecar
 */

import type { PredictionProvenance } from "../predictor-interface";
import { readIndexLineageSidecar } from "./index-lineage";

export function buildPredictionProvenance(opts: {
  examId: string;
  manifestVersion: string;
  predictorIndex: { path: string; sha256: string };
}): PredictionProvenance {
  const lineage = readIndexLineageSidecar(opts.predictorIndex.path);
  const linkedCutoffs =
    lineage?.source_cutoffs.map((entry) => ({
      dataset: "cutoffs",
      path: entry.path,
      sha256: entry.sha256,
      role: "linked" as const,
    })) ?? [];

  return {
    exam_id: opts.examId,
    manifest_version: opts.manifestVersion,
    datasets_used: [
      {
        dataset: "predictor_index",
        path: opts.predictorIndex.path,
        sha256: opts.predictorIndex.sha256,
        role: "loaded",
      },
      ...linkedCutoffs,
    ],
    ...(lineage ? { index_lineage: lineage.source_cutoffs } : {}),
    generated_at: new Date().toISOString(),
  };
}
