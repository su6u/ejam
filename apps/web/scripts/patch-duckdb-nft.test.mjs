import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { patchDuckdbNft } from "./patch-duckdb-nft.mjs";

function makeFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ejam-duckdb-nft-"));
  const appDir = path.join(repoRoot, "apps", "web");
  const standaloneDir = path.join(appDir, ".next", "standalone");
  const relativeNodePath = path.join(
    "node_modules",
    ".pnpm",
    "@duckdb+node-bindings-linux-x64@1.5.2-r.1",
    "node_modules",
    "@duckdb",
    "node-bindings-linux-x64",
    "duckdb.node",
  );
  const standaloneNodePath = path.join(standaloneDir, relativeNodePath);
  const sourceLibPath = path.join(
    repoRoot,
    relativeNodePath.replace(/duckdb\.node$/, "libduckdb.so"),
  );
  const copiedLibPath = standaloneNodePath.replace(
    /duckdb\.node$/,
    "libduckdb.so",
  );

  fs.mkdirSync(path.dirname(standaloneNodePath), { recursive: true });
  fs.writeFileSync(standaloneNodePath, "native binding");

  return {
    appDir,
    cleanup: () => fs.rmSync(repoRoot, { force: true, recursive: true }),
    copiedLibPath,
    sourceLibPath,
  };
}

test("copies libduckdb next to traced standalone duckdb.node", () => {
  const fixture = makeFixture();
  try {
    fs.mkdirSync(path.dirname(fixture.sourceLibPath), { recursive: true });
    fs.writeFileSync(fixture.sourceLibPath, "shared library");

    const result = patchDuckdbNft({ appDir: fixture.appDir });

    assert.equal(result.standaloneNodeCount, 1);
    assert.equal(result.copiedCount, 1);
    assert.equal(
      fs.readFileSync(fixture.copiedLibPath, "utf8"),
      "shared library",
    );
  } finally {
    fixture.cleanup();
  }
});

test("fails when a traced standalone duckdb.node has no libduckdb companion", () => {
  const fixture = makeFixture();
  try {
    assert.throws(
      () => patchDuckdbNft({ appDir: fixture.appDir }),
      /missing libduckdb shared library/,
    );
    assert.equal(fs.existsSync(fixture.copiedLibPath), false);
  } finally {
    fixture.cleanup();
  }
});

test("adds exam taxonomy and manifest data to the predictor route trace", () => {
  const repoRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "ejam-predictor-nft-"),
  );
  const appDir = path.join(repoRoot, "apps", "web");
  const dataRoot = path.join(repoRoot, "data");
  const serverDir = path.join(appDir, ".next", "server");
  const nftPath = path.join(
    serverDir,
    "app",
    "api",
    "predict",
    "[exam_id]",
    "route.js.nft.json",
  );
  const examYaml = path.join(
    dataRoot,
    "reference",
    "taxonomy",
    "exams",
    "jee-main.yaml",
  );
  const manifestPath = path.join(
    dataRoot,
    "catalog",
    "releases",
    "v0.2.0.json",
  );
  const indexPath = path.join(
    dataRoot,
    "tools",
    "college-predictor",
    "josaa",
    "predictor-index.parquet",
  );

  fs.mkdirSync(path.dirname(examYaml), { recursive: true });
  fs.writeFileSync(examYaml, "id: jee-main\n");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      version: "v0.2.0",
      datasets: [
        {
          path: "tools/college-predictor/josaa/predictor-index.parquet",
          sha256: "abc",
          bytes: 1,
        },
      ],
    }),
  );
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, "parquet");
  fs.mkdirSync(path.dirname(nftPath), { recursive: true });
  fs.writeFileSync(nftPath, JSON.stringify({ version: 1, files: [] }));

  try {
    const result = patchDuckdbNft({ appDir });
    const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));

    assert.equal(result.patchedPredictorTraces, 1);
    assert.ok(result.addedPredictorDataFiles >= 3);
    assert.ok(
      trace.files.some((file) =>
        file.endsWith("reference/taxonomy/exams/jee-main.yaml"),
      ),
    );
    assert.ok(
      trace.files.some((file) => file.endsWith("catalog/releases/v0.2.0.json")),
    );
    assert.ok(
      trace.files.some((file) =>
        file.endsWith("tools/college-predictor/josaa/predictor-index.parquet"),
      ),
    );
  } finally {
    fs.rmSync(repoRoot, { force: true, recursive: true });
  }
});
