/**
 * college predictor module barrel export
 * uses extension-less imports — moduleResolution: bundler does not require .js extensions
 * and Turbopack cannot resolve .js to .ts for uncompiled workspace packages
 **/

export type {
  BrowserCacheEnvironment,
  IndexBufferCacheSource,
  LoadCollegePredictorIndexBufferOptions,
  LoadCollegePredictorIndexBufferResult,
} from "./browser-cache-manager";
export {
  clearPredictionResultCache,
  createIndexCacheKey,
  createPredictionResultCacheKey,
  getCachedCollegePredictorIndex,
  loadCollegePredictorIndexBuffer,
  readPredictionResultCache,
  storeCollegePredictorIndex,
  writePredictionResultCache,
} from "./browser-cache-manager";
export type {
  CollegePredictionResult,
  CollegePredictorFilters,
  CollegePredictorIndexRow,
  ProbabilityBand,
  ProgramPrediction,
} from "./engine";
export {
  applyCollegePredictorFilters,
  classifyBand,
  computeProbability,
  deriveConfidence,
  normalCDF,
  predictPrograms,
} from "./engine";
export {
  _resetJosaaIndexCache,
  getJosaaIndex,
} from "./index-loader";
export {
  _resetCanonicalStatesCache,
  loadCanonicalStates,
} from "./state-registry";
export type { CollegePredictorUrlInput } from "./url-params";
export {
  buildCollegePredictorSharePath,
  decodeCollegePredictorUrlParams,
  encodeCollegePredictorUrlParams,
} from "./url-params";
