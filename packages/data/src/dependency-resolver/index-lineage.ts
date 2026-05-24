/**
 * runtime reader for index lineage sidecars — Node-only
 * sidecars are written at index build time; cutoffs appear as linked provenance
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { resolveDataRoot } from "../data-root";

const IndexLineageEntry = z.object({
  path: z.string(),
  sha256: z.string(),
});

export const IndexLineage = z.object({
  index_dataset: z.string(),
  built_at: z.string(),
  manifest_version: z.string().optional(),
  source_cutoffs: z.array(IndexLineageEntry),
});
export type IndexLineage = z.infer<typeof IndexLineage>;

function dataRoot(): string {
  return resolveDataRoot();
}

export function readIndexLineageSidecar(
  indexManifestPath: string,
): IndexLineage | null {
  const sidecarPath = indexManifestPath.replace(/\.parquet$/, ".lineage.json");
  const absolute = join(dataRoot(), sidecarPath);
  if (!existsSync(absolute)) return null;
  const parsed = IndexLineage.safeParse(
    JSON.parse(readFileSync(absolute, "utf-8")),
  );
  return parsed.success ? parsed.data : null;
}
