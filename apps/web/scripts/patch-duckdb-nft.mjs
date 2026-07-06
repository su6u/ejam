/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultAppDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appDir = process.env.EJAM_WEB_APP_DIR
  ? path.resolve(process.env.EJAM_WEB_APP_DIR)
  : defaultAppDir;
const serverDir = path.join(appDir, ".next/server");

function walkNftFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkNftFiles(full, acc);
    else if (entry.name.endsWith(".nft.json")) acc.push(full);
  }
  return acc;
}

function sharedLibForNodeTrace(nodeTracePath) {
  if (nodeTracePath.endsWith("/duckdb.node")) {
    const so = nodeTracePath.replace(/duckdb\.node$/, "libduckdb.so");
    const dylib = nodeTracePath.replace(/duckdb\.node$/, "libduckdb.dylib");
    return [so, dylib];
  }
  return [];
}

function resolveFromPageDir(pageDir, tracePath) {
  const abs = path.resolve(pageDir, tracePath);
  return fs.existsSync(abs) ? abs : null;
}

let patched = 0;

for (const nftPath of walkNftFiles(serverDir)) {
  const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));
  if (!Array.isArray(trace.files)) continue;

  const usesDuckdb = trace.files.some((f) => f.includes("duckdb"));
  if (!usesDuckdb) continue;

  const pageDir = path.dirname(nftPath);
  const existing = new Set(trace.files);
  const toAdd = [];

  for (const file of trace.files) {
    if (!file.includes("duckdb.node")) continue;
    for (const candidate of sharedLibForNodeTrace(file)) {
      if (existing.has(candidate)) continue;
      if (resolveFromPageDir(pageDir, candidate)) toAdd.push(candidate);
    }
  }

  if (toAdd.length === 0) continue;

  trace.files.push(...toAdd);
  fs.writeFileSync(nftPath, JSON.stringify(trace));
  patched += 1;
}

if (patched > 0) {
  console.log(
    `patch-duckdb-nft: updated ${patched} trace file(s) with libduckdb shared libs`,
  );
}

// Physical copying of libduckdb.{so,dylib} to standalone directory
const standaloneDir = path.join(appDir, ".next/standalone");
const repoRoot = path.join(appDir, "../..");

function walkFiles(dir, matchName, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, matchName, acc);
    } else if (entry.name === matchName) {
      acc.push(full);
    }
  }
  return acc;
}

if (fs.existsSync(standaloneDir)) {
  const standaloneNodes = walkFiles(standaloneDir, "duckdb.node");
  console.log(
    `patch-duckdb-nft: found ${standaloneNodes.length} duckdb.node file(s) in standalone`,
  );

  let copiedCount = 0;
  const missingSharedLibs = [];
  for (const standaloneNodePath of standaloneNodes) {
    const relativePath = path.relative(standaloneDir, standaloneNodePath);
    const repoPath = path.join(repoRoot, relativePath);

    const srcSo = repoPath.replace(/duckdb\.node$/, "libduckdb.so");
    const srcDylib = repoPath.replace(/duckdb\.node$/, "libduckdb.dylib");

    const destSo = standaloneNodePath.replace(/duckdb\.node$/, "libduckdb.so");
    const destDylib = standaloneNodePath.replace(
      /duckdb\.node$/,
      "libduckdb.dylib",
    );

    if (fs.existsSync(srcSo)) {
      console.log(`patch-duckdb-nft: copying ${srcSo} -> ${destSo}`);
      fs.copyFileSync(srcSo, destSo);
      copiedCount++;
    }
    if (fs.existsSync(srcDylib)) {
      console.log(`patch-duckdb-nft: copying ${srcDylib} -> ${destDylib}`);
      fs.copyFileSync(srcDylib, destDylib);
      copiedCount++;
    }

    if (!fs.existsSync(destSo) && !fs.existsSync(destDylib)) {
      missingSharedLibs.push({
        standaloneNodePath,
        searched: [srcSo, srcDylib],
      });
    }
  }
  console.log(
    `patch-duckdb-nft: copied ${copiedCount} shared library files to standalone`,
  );

  if (missingSharedLibs.length > 0) {
    console.error(
      "patch-duckdb-nft: DuckDB native binding(s) in standalone are missing libduckdb shared libraries",
    );
    for (const missing of missingSharedLibs) {
      console.error(`  duckdb.node: ${missing.standaloneNodePath}`);
      console.error("  searched:");
      for (const candidate of missing.searched) {
        console.error(`    ${candidate}`);
      }
    }
    process.exitCode = 1;
  }
} else {
  console.log(
    "patch-duckdb-nft: standalone directory not found, skipping file copy",
  );
}
