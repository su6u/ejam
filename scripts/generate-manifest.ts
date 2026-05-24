#!/usr/bin/env tsx
/**
 * generates data/manifest/v*.json from parquet files under data/engineering and data/dist
 * run after ingest or index build: pnpm generate:manifest
 */

import {
  collectParquetDatasets,
  findLatestManifestVersion,
  getGitSha,
  writeManifest,
} from "./lib/manifest";

async function main(): Promise<void> {
  const version =
    process.argv.find((a) => a.startsWith("--version="))?.slice(11) ??
    (process.env.EJAM_MANIFEST_VERSION
      ? process.env.EJAM_MANIFEST_VERSION.startsWith("v")
        ? process.env.EJAM_MANIFEST_VERSION
        : `v${process.env.EJAM_MANIFEST_VERSION}`
      : await findLatestManifestVersion().catch(() => "v0.1.0"));

  console.log(`Generating manifest ${version}...`);
  const datasets = await collectParquetDatasets();
  if (datasets.length === 0) {
    console.error("No parquet datasets found under data/engineering or data/dist");
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
