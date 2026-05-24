#!/usr/bin/env tsx
/**
 * asserts index lineage sidecars list the same cutoff paths the build scripts consumed
 **/

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { IndexLineage } from "./lib/index-lineage";
import { DATA_DIR } from "./lib/manifest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SIDEcars = [
  {
    sidecar: "dist/college_predictor_index.lineage.json",
    cutoffRoot: "engineering/jee/josaa/cutoffs",
  },
  {
    sidecar: "dist/csab_predictor_index.lineage.json",
    cutoffRoot: "engineering/jee/csab/cutoffs",
  },
] as const;

function listCutoffParquets(cutoffRoot: string): string[] {
  const base = path.join(DATA_DIR, cutoffRoot);
  const out: string[] = [];
  for (const yearDir of fs.readdirSync(base).filter((d) => d.startsWith("year="))) {
    const yearPath = path.join(base, yearDir);
    for (const roundDir of fs.readdirSync(yearPath).filter((d) =>
      d.startsWith("round="),
    )) {
      const parquet = path.join(yearPath, roundDir, "cutoffs.parquet");
      if (fs.existsSync(parquet)) {
        out.push(
          path.join(cutoffRoot, yearDir, roundDir, "cutoffs.parquet").split(path.sep).join("/"),
        );
      }
    }
  }
  return out.sort();
}

function verifySidecar(
  sidecarRel: string,
  cutoffRoot: string,
): string | null {
  const absolute = path.join(DATA_DIR, sidecarRel);
  if (!fs.existsSync(absolute)) {
    return `missing sidecar: ${sidecarRel}`;
  }
  const lineage = JSON.parse(fs.readFileSync(absolute, "utf-8")) as IndexLineage;
  const expected = listCutoffParquets(cutoffRoot);
  const actual = lineage.source_cutoffs.map((c) => c.path).sort();
  if (expected.length !== actual.length) {
    return `${sidecarRel}: expected ${expected.length} cutoffs, sidecar has ${actual.length}`;
  }
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      return `${sidecarRel}: path mismatch at ${i}: ${actual[i]} vs ${expected[i]}`;
    }
  }
  return null;
}

function main(): void {
  let failed = 0;
  for (const { sidecar, cutoffRoot } of SIDEcars) {
    const err = verifySidecar(sidecar, cutoffRoot);
    if (err) {
      console.error(`✗ ${err}`);
      failed++;
    } else {
      console.log(`✓ ${sidecar}`);
    }
  }
  if (failed > 0) process.exit(1);
}

main();
