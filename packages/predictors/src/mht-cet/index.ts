import type { ExamPredictor } from "@ejam/data";
import {
  getMhtCetPredictorIndexFromDeps,
  loadMhtCetSeatPoolRegistry,
  MhtCetPredictionInput,
  MhtCetPredictionResult,
  type MhtCetPredictionResult as MhtCetPredictionResultType,
  predictMhtCetPrograms,
} from "@ejam/data/mht-cet";
import {
  createServerCacheKey,
  getServerCacheEntry,
  setServerCacheEntry,
} from "../shared/predictor-cache";
import { processMhtCetResult, unfilteredMhtInput } from "./result-processing";

const fullResultCache = new Map<string, MhtCetPredictionResultType>();
const FULL_RESULT_CACHE_MAX_ENTRIES = 1;

export function _resetMhtCetFullResultCache(): void {
  fullResultCache.clear();
}

export const predictor: ExamPredictor<
  MhtCetPredictionInput,
  MhtCetPredictionResultType
> = {
  inputSchema: MhtCetPredictionInput,

  async predict(input, deps) {
    const indexDataset = deps.resolvedDatasets.find(
      (dataset) => dataset.dataset === "predictor_index",
    );
    if (!indexDataset) {
      throw new Error("MHT-CET predictor index dependency is unavailable");
    }
    const baseInput = unfilteredMhtInput(input);
    const cacheKey = createServerCacheKey({
      exam_id: "mht-cet",
      index_sha256: indexDataset.sha256,
      input: baseInput,
    });
    let fullResult = input.result_options
      ? getServerCacheEntry(fullResultCache, cacheKey)
      : undefined;
    if (!fullResult) {
      const indexRows = await getMhtCetPredictorIndexFromDeps(deps);
      fullResult = predictMhtCetPrograms({
        input: baseInput,
        indexRows,
        seatPoolRegistry: loadMhtCetSeatPoolRegistry(),
      });
      if (input.result_options) {
        setServerCacheEntry(
          fullResultCache,
          cacheKey,
          fullResult,
          FULL_RESULT_CACHE_MAX_ENTRIES,
        );
      }
    }
    const result = processMhtCetResult({
      fullResult,
      input,
      indexSha256: indexDataset.sha256,
    });
    return { result: MhtCetPredictionResult.parse(result) };
  },
};
