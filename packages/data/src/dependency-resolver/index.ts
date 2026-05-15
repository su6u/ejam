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
export type {
  DependencyResolutionResult,
  Manifest,
  ManifestDataset,
  MissingDependency,
  ResolvedDependency,
} from "./types";
