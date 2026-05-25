/**
 * shared manifest generation — single canonical format for data/manifest/v*.json
 * used by generate-manifest.ts, build-data.ts, and fetch-data.ts
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { pickLatestManifestFile } from "../../packages/data/src/semver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const DATA_DIR = path.join(ROOT, "data");

export type ManifestDatasetEntry = {
  path: string;
  sha256: string;
  bytes: number;
};

export type CanonicalManifest = {
  version: string;
  generated_at: string;
  git_sha: string;
  datasets: ManifestDatasetEntry[];
  chunks?: ManifestDatasetEntry[];
};

const PARQUET_SCAN_ROOTS = [
  path.join(DATA_DIR, "engineering"),
  path.join(DATA_DIR, "dist"),
];

const PREDICTOR_DIST_FILES = new Set([
  "college_predictor_index.parquet",
  "csab_predictor_index.parquet",
  "college_predictor_index.lineage.json",
  "csab_predictor_index.lineage.json",
]);

function isPathInside(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveContainedPath(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  if (!isPathInside(resolvedRoot, resolvedPath)) {
    throw new Error(
      `refusing path outside ${resolvedRoot}: ${segments.join("/")}`,
    );
  }
  return resolvedPath;
}

async function sha256File(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function* walkParquetFiles(
  dir: string,
): AsyncGenerator<{ absolutePath: string; manifestPath: string }> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "." || entry.name === "..") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`refusing to follow symlink: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      if (entry.name === "_raw" || entry.name === "sandbox") continue;
      yield* walkParquetFiles(fullPath);
      continue;
    }

    const inDist = dir === path.join(DATA_DIR, "dist");
    if (inDist) {
      if (!PREDICTOR_DIST_FILES.has(entry.name)) continue;
    } else if (!entry.name.endsWith(".parquet")) {
      continue;
    }

    const manifestPath = path
      .relative(DATA_DIR, fullPath)
      .split(path.sep)
      .join("/");
    yield { absolutePath: fullPath, manifestPath };
  }
}

export async function getGitSha(cwd = ROOT): Promise<string> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync("git rev-parse --short HEAD", {
      cwd,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export async function collectParquetDatasets(): Promise<ManifestDatasetEntry[]> {
  const datasets: ManifestDatasetEntry[] = [];

  for (const scanRoot of PARQUET_SCAN_ROOTS) {
    try {
      await fs.access(scanRoot);
    } catch {
      continue;
    }

    for await (const { absolutePath, manifestPath } of walkParquetFiles(
      scanRoot,
    )) {
      const stat = await fs.stat(absolutePath);
      const sha256 = await sha256File(absolutePath);
      datasets.push({ path: manifestPath, sha256, bytes: stat.size });
    }
  }

  datasets.sort((a, b) => a.path.localeCompare(b.path));
  return datasets;
}

export function manifestFilePath(version: string): string {
  const fileName = version.startsWith("v") ? `${version}.json` : `v${version}.json`;
  return resolveContainedPath(path.join(DATA_DIR, "manifest"), fileName);
}

export async function writeManifest(
  manifest: CanonicalManifest,
): Promise<string> {
  const manifestPath = manifestFilePath(manifest.version);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

export async function readManifest(version: string): Promise<CanonicalManifest> {
  const manifestPath = manifestFilePath(version);
  const raw = await fs.readFile(manifestPath, "utf-8");
  return JSON.parse(raw) as CanonicalManifest;
}

export async function findLatestManifestVersion(): Promise<string> {
  const manifestDir = path.join(DATA_DIR, "manifest");
  const latest = pickLatestManifestFile(await fs.readdir(manifestDir));
  if (!latest) {
    throw new Error(`no manifest JSON files found in ${manifestDir}`);
  }
  return latest.replace(/\.json$/, "");
}

export function dataRootPath(manifestRelativePath: string): string {
  return resolveContainedPath(DATA_DIR, manifestRelativePath);
}
