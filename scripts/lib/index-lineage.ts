/**
 * build-time lineage sidecars for predictor index parquets
 * records which cutoff files DuckDB consumed so runtime provenance need not hash 60+ cutoffs per request
 **/

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { DATA_DIR, findLatestManifestVersion } from "./manifest";

export type IndexLineage = {
  index_dataset: string;
  built_at: string;
  manifest_version?: string;
  source_cutoffs: Array<{ path: string; sha256: string }>;
};

export function lineageSidecarPath(indexParquetPath: string): string {
  return indexParquetPath.replace(/\.parquet$/, ".lineage.json");
}

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function toManifestRelativePath(absolutePath: string): string {
  const rel = path.relative(DATA_DIR, absolutePath);
  if (rel.startsWith("..")) {
    throw new Error(`cutoff path outside data/: ${absolutePath}`);
  }
  return rel.split(path.sep).join("/");
}

export function collectSourceCutoffs(
  cutoffAbsolutePaths: string[],
): IndexLineage["source_cutoffs"] {
  return cutoffAbsolutePaths
    .map((absolutePath) => ({
      path: toManifestRelativePath(absolutePath),
      sha256: sha256File(absolutePath),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function writeIndexLineageSidecar(opts: {
  indexParquetPath: string;
  indexDataset: string;
  sourceCutoffPaths: string[];
  manifestVersion?: string;
}): string {
  const sidecarPath = lineageSidecarPath(opts.indexParquetPath);
  const lineage: IndexLineage = {
    index_dataset: opts.indexDataset,
    built_at: new Date().toISOString(),
    manifest_version: opts.manifestVersion,
    source_cutoffs: collectSourceCutoffs(opts.sourceCutoffPaths),
  };
  fs.writeFileSync(sidecarPath, `${JSON.stringify(lineage, null, 2)}\n`);
  return sidecarPath;
}

export async function resolveManifestVersionForBuild(): Promise<
  string | undefined
> {
  try {
    return await findLatestManifestVersion();
  } catch {
    return undefined;
  }
}

export function readIndexLineageSidecar(
  indexManifestPath: string,
): IndexLineage | null {
  const sidecarManifestPath = indexManifestPath.replace(
    /\.parquet$/,
    ".lineage.json",
  );
  const absolute = path.join(DATA_DIR, sidecarManifestPath);
  if (!fs.existsSync(absolute)) return null;
  return JSON.parse(fs.readFileSync(absolute, "utf-8")) as IndexLineage;
}
