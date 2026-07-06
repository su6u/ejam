import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scriptPath = fileURLToPath(
  new URL("./patch-duckdb-nft.mjs", import.meta.url),
);
const duckdbRelativePath = path.join(
  "node_modules",
  "@duckdb",
  "node-bindings-linux-x64",
  "duckdb.node",
);

async function createFixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "ejam-duckdb-patch-"));
  const appDir = path.join(rootDir, "apps", "web");
  const standaloneNodePath = path.join(
    appDir,
    ".next",
    "standalone",
    duckdbRelativePath,
  );
  await mkdir(path.dirname(standaloneNodePath), { recursive: true });
  await writeFile(standaloneNodePath, "");
  return { appDir, rootDir, standaloneNodePath };
}

function runPatch(appDir) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      EJAM_WEB_APP_DIR: appDir,
    },
  });
}

test("fails when standalone duckdb.node has no shared library", async () => {
  const { appDir, rootDir } = await createFixture();
  try {
    const result = runPatch(appDir);

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /DuckDB native binding\(s\) in standalone are missing libduckdb/,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("copies a repo shared library next to standalone duckdb.node", async () => {
  const { appDir, rootDir, standaloneNodePath } = await createFixture();
  try {
    const sourceLibPath = path.join(
      rootDir,
      duckdbRelativePath.replace(/duckdb\.node$/, "libduckdb.so"),
    );
    await mkdir(path.dirname(sourceLibPath), { recursive: true });
    await writeFile(sourceLibPath, "native-lib");

    const result = runPatch(appDir);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /copied 1 shared library files/);
    const copiedLibPath = standaloneNodePath.replace(
      /duckdb\.node$/,
      "libduckdb.so",
    );
    assert.equal(path.dirname(copiedLibPath), path.dirname(standaloneNodePath));
    assert.equal(await readFile(copiedLibPath, "utf8"), "native-lib");
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
