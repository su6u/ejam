#!/usr/bin/env tsx
/**
 * verifies local parquet files match the pinned manifest, or downloads a release bundle
 * usage:
 *   pnpm data:fetch              # verify all manifest datasets exist locally
 *   pnpm data:fetch --download   # download release tarball when files are missing
 */

import * as crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  compareManifestVersions,
  sortManifestVersionsDesc,
} from "@ejam/data/semver";
import {
  dataRootPath,
  findLatestManifestVersion,
  type CanonicalManifest,
  getGitSha,
  type ManifestDatasetEntry,
  ROOT,
  readManifest,
  writeManifest,
} from "./lib/manifest.js";

class DataReleaseDownloadError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const GENERATED_DATASET_BUILDERS = [
  {
    name: "JoSAA predictor index",
    script: "build:predictor-index",
    paths: [
      "dist/college_predictor_index.parquet",
      "dist/college_predictor_index.lineage.json",
    ],
  },
  {
    name: "CSAB predictor index",
    script: "build:csab-index",
    paths: [
      "dist/csab_predictor_index.parquet",
      "dist/csab_predictor_index.lineage.json",
    ],
  },
] as const;

const GENERATED_DATASET_PATHS: Set<string> = new Set(
  GENERATED_DATASET_BUILDERS.flatMap((builder) => builder.paths),
);

async function sha256File(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function verifyDataset(
  entry: ManifestDatasetEntry,
): Promise<string | null> {
  const absolutePath = dataRootPath(entry.path);
  try {
    await fs.access(absolutePath);
  } catch {
    return `missing: ${entry.path}`;
  }

  const actual = await sha256File(absolutePath);
  if (actual !== entry.sha256) {
    return `checksum mismatch for ${entry.path}: expected ${entry.sha256}, got ${actual}`;
  }
  return null;
}

async function downloadRelease(version: string): Promise<void> {
  const repo = process.env.EJAM_DATA_REPO ?? "su6u/ejam";
  const tag =
    process.env.EJAM_DATA_RELEASE_TAG ?? `data-${version.replace(/^v/, "")}`;
  const url =
    process.env.EJAM_DATA_RELEASE_URL ??
    `https://github.com/${repo}/releases/download/${tag}/${tag}.tar.gz`;

  console.log(`Downloading ${url} ...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new DataReleaseDownloadError(
      `release download failed (${response.status}): ${url}\nSet EJAM_DATA_RELEASE_URL to override.`,
      response.status,
    );
  }

  const archivePath = path.join(ROOT, ".data-release.tar.gz");
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(archivePath, buffer);

  const { execSync } = await import("node:child_process");
  execSync(`tar -xzf "${archivePath}" -C "${path.join(ROOT, "data")}"`, {
    stdio: "inherit",
  });
  await fs.unlink(archivePath);
  console.log("Release extracted into data/");
}

async function listManifestVersions(): Promise<string[]> {
  const manifestDir = path.join(ROOT, "data", "manifest");
  const files = await fs.readdir(manifestDir);
  return sortManifestVersionsDesc(
    files
      .filter((file) => file.startsWith("v") && file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, "")),
  );
}

async function findPreviousManifestVersion(
  version: string,
): Promise<string | null> {
  const versions = await listManifestVersions();
  return (
    versions.find(
      (candidate) => compareManifestVersions(candidate, version) < 0,
    ) ?? null
  );
}

function generatedDeltaOnly(
  manifest: CanonicalManifest,
  previousManifest: CanonicalManifest,
): string[] | null {
  const previousByPath = new Map(
    previousManifest.datasets.map((entry) => [entry.path, entry]),
  );
  const currentPaths = new Set(manifest.datasets.map((entry) => entry.path));
  const changedGeneratedPaths: string[] = [];

  for (const entry of manifest.datasets) {
    const previous = previousByPath.get(entry.path);
    if (!previous) return null;

    if (previous.sha256 === entry.sha256 && previous.bytes === entry.bytes) {
      continue;
    }

    if (!GENERATED_DATASET_PATHS.has(entry.path)) return null;
    changedGeneratedPaths.push(entry.path);
  }

  for (const entry of previousManifest.datasets) {
    if (
      !currentPaths.has(entry.path) &&
      !GENERATED_DATASET_PATHS.has(entry.path)
    ) {
      return null;
    }
  }

  return changedGeneratedPaths;
}

function rebuildGeneratedDatasets(
  version: string,
  changedGeneratedPaths: string[],
): void {
  for (const builder of GENERATED_DATASET_BUILDERS) {
    if (
      !builder.paths.some((datasetPath) =>
        changedGeneratedPaths.includes(datasetPath),
      )
    ) {
      continue;
    }

    console.log(`Rebuilding ${builder.name} for manifest ${version}...`);
    execFileSync("pnpm", [builder.script], {
      cwd: ROOT,
      env: {
        ...process.env,
        EJAM_MANIFEST_VERSION: version,
      },
      stdio: "inherit",
    });
  }
}

async function refreshGeneratedDatasetEntries(
  manifest: CanonicalManifest,
  changedGeneratedPaths: string[],
): Promise<CanonicalManifest> {
  const changed = new Set(changedGeneratedPaths);
  const datasets: ManifestDatasetEntry[] = [];

  for (const entry of manifest.datasets) {
    if (!changed.has(entry.path)) {
      datasets.push(entry);
      continue;
    }

    const absolutePath = dataRootPath(entry.path);
    const stat = await fs.stat(absolutePath);
    datasets.push({
      ...entry,
      sha256: await sha256File(absolutePath),
      bytes: stat.size,
    });
  }

  const hydratedManifest: CanonicalManifest = {
    ...manifest,
    generated_at: new Date().toISOString(),
    git_sha: await getGitSha(),
    datasets,
  };
  await writeManifest(hydratedManifest);
  return hydratedManifest;
}

async function hydrateFromPreviousRelease(
  version: string,
  manifest: CanonicalManifest,
): Promise<CanonicalManifest | null> {
  const previousVersion = await findPreviousManifestVersion(version);
  if (!previousVersion) return null;

  const previousManifest = await readManifest(previousVersion);
  const changedGeneratedPaths = generatedDeltaOnly(manifest, previousManifest);
  if (!changedGeneratedPaths) return null;

  console.warn(
    `No release asset for ${version}; bootstrapping from ${previousVersion} and rebuilding generated index datasets.`,
  );
  await downloadRelease(previousVersion);
  rebuildGeneratedDatasets(version, changedGeneratedPaths);
  return refreshGeneratedDatasetEntries(manifest, changedGeneratedPaths);
}

async function main(): Promise<void> {
  const shouldDownload = process.argv.includes("--download");
  const versionArg = process.argv.find((a) => a.startsWith("--version="));
  const version =
    versionArg?.slice("--version=".length) ??
    process.env.EJAM_MANIFEST_VERSION ??
    (await findLatestManifestVersion());

  console.log(`Using manifest ${version}`);
  let manifest = await readManifest(version);
  const failures: string[] = [];

  for (const entry of manifest.datasets) {
    const failure = await verifyDataset(entry);
    if (failure) failures.push(failure);
  }

  if (failures.length === 0) {
    console.log(`✓ all ${manifest.datasets.length} datasets verified`);
    return;
  }

  console.error(`${failures.length} dataset issue(s):`);
  for (const failure of failures) {
    console.error(`  ✗ ${failure}`);
  }

  if (!shouldDownload) {
    console.error(
      "\nRun with --download after publishing a GitHub release, or clone with data files included.",
    );
    process.exit(1);
  }

  try {
    await downloadRelease(version);
  } catch (err) {
    const shouldHydrate =
      err instanceof DataReleaseDownloadError && err.status === 404;
    const hydratedManifest = shouldHydrate
      ? await hydrateFromPreviousRelease(version, manifest)
      : null;
    if (!hydratedManifest) {
      throw err;
    }
    manifest = hydratedManifest;
  }

  const remaining: string[] = [];
  for (const entry of manifest.datasets) {
    const failure = await verifyDataset(entry);
    if (failure) remaining.push(failure);
  }
  if (remaining.length > 0) {
    console.error("Download completed but verification still failed:");
    for (const failure of remaining) {
      console.error(`  ✗ ${failure}`);
    }
    process.exit(1);
  }
  console.log(
    `✓ all ${manifest.datasets.length} datasets verified after download`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
