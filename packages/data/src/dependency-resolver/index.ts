/**
 * single entry point for data dependency resolution and manifest gating
 * downstream slices import from here — not from resolver or types directly
 */

export {
  assertPublishable,
  loadLatestManifest,
  loadManifest,
  resolveExamDependencies,
} from "./resolver";
export { readIndexLineageSidecar } from "./index-lineage";
export { buildPredictionProvenance } from "./provenance";
export {
  assertResolvedDataset,
  findResolvedDataset,
  manifestPathToDataRoot,
  verifyDatasetSha256,
  type ResolvedDatasetRef,
} from "./dataset-path";
export type {
  DependencyResolutionResult,
  Manifest,
  ManifestDataset,
  MissingDependency,
  ResolvedDependency,
} from "./types";
