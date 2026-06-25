#!/usr/bin/env tsx
/**
 * generates data/catalog/releases/v*.json from data/datasets and data/tools
 * run after ingest or index build: pnpm generate:manifest
 * auto-bumps patch semver when --version is omitted; pass --version=vX.Y.Z to pin
 */

import { bumpPatchVersion } from "@ejam/data/semver";
import {
  collectParquetDatasets,
  findLatestManifestVersion,
  getGitSha,
  writeManifest,
} from "./lib/manifest.js";

function normalizeVersion(raw: string): string {
  return raw.startsWith("v") ? raw : `v${raw}`;
}

async function resolveManifestVersion(): Promise<string> {
  const explicitArg = process.argv
    .find((a) => a.startsWith("--version="))
    ?.slice("--version=".length);
  if (explicitArg) return normalizeVersion(explicitArg);

  if (process.env.EJAM_MANIFEST_VERSION) {
    return normalizeVersion(process.env.EJAM_MANIFEST_VERSION);
  }

  const latest = await findLatestManifestVersion().catch(() => null);
  if (!latest) return "v0.1.0";
  return bumpPatchVersion(latest);
}

async function main(): Promise<void> {
  const version = await resolveManifestVersion();

  console.log(`Generating catalog release ${version}...`);
  const datasets = await collectParquetDatasets();
  if (datasets.length === 0) {
    console.error(
      "No release payloads found under data/datasets or data/tools",
    );
    process.exit(1);
  }

  const manifestPath = await writeManifest({
    version,
    generated_at: new Date().toISOString(),
    git_sha: await getGitSha(),
    datasets,
  });

  console.log(`Wrote ${datasets.length} datasets to ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
