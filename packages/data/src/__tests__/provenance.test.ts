import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetDataRootCache } from "../data-root";
import { buildPredictionProvenance } from "../dependency-resolver/provenance";

let fixtureRoot = "";

beforeEach(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "ejam-provenance-"));
  process.env.EJAM_DATA_ROOT = fixtureRoot;
  _resetDataRootCache();
});

afterEach(() => {
  _resetDataRootCache();
  delete process.env.EJAM_DATA_ROOT;
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("buildPredictionProvenance", () => {
  it("marks predictor_index loaded and sidecar cutoffs linked", () => {
    const indexPath = "dist/index.parquet";
    mkdirSync(join(fixtureRoot, "dist"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, "dist", "index.lineage.json"),
      JSON.stringify({
        index_dataset: "predictor_index",
        built_at: "2026-01-01T00:00:00.000Z",
        source_cutoffs: [
          {
            path: "engineering/jee/csab/cutoffs/year=2024/round=1/cutoffs.parquet",
            sha256: "abc",
          },
        ],
      }),
    );

    const provenance = buildPredictionProvenance({
      examId: "csab",
      manifestVersion: "v0.1.0",
      predictorIndex: { path: indexPath, sha256: "deadbeef" },
    });

    expect(provenance.datasets_used[0]).toMatchObject({
      dataset: "predictor_index",
      role: "loaded",
    });
    expect(provenance.datasets_used[1]).toMatchObject({
      dataset: "cutoffs",
      role: "linked",
    });
    expect(provenance.index_lineage).toHaveLength(1);
  });
});
