/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 * It also omits predictor data files that are resolved dynamically at request time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function walkRegularFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRegularFiles(full, acc);
    else if (entry.isFile()) acc.push(full);
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

function hasManifestDir(dataDir) {
  return fs.existsSync(path.join(dataDir, "manifest"));
}

function resolveTraceableDataRoot() {
  const appDataRoot = path.join(appDir, "data");
  if (hasManifestDir(appDataRoot)) return appDataRoot;

  const monorepoDataRoot = path.join(appDir, "../..", "data");
  if (hasManifestDir(monorepoDataRoot)) return monorepoDataRoot;

  return null;
}

function isPredictorRouteTrace(nftPath) {
  return nftPath
    .split(path.sep)
    .join("/")
    .endsWith("app/api/predict/[exam_id]/route.js.nft.json");
}

function tracePathFrom(pageDir, absolutePath) {
  return path.relative(pageDir, absolutePath).split(path.sep).join("/");
}

function resolveFromPageDir(pageDir, tracePath) {
  const abs = path.resolve(pageDir, tracePath);
  return fs.existsSync(abs) ? abs : null;
}

let duckdbPatched = 0;
let dataPatched = 0;

for (const nftPath of walkNftFiles(serverDir)) {
  const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));
  if (!Array.isArray(trace.files)) continue;

  const usesDuckdb = trace.files.some((f) => f.includes("duckdb"));
  const isPredictorRoute = isPredictorRouteTrace(nftPath);
  if (!usesDuckdb && !isPredictorRoute) continue;

  const pageDir = path.dirname(nftPath);
  const existing = new Set(trace.files);
  const toAdd = [];
  let addedDuckdbFiles = false;
  let addedDataFiles = false;

  if (usesDuckdb) {
    for (const file of trace.files) {
      if (!file.includes("duckdb.node")) continue;
      for (const candidate of sharedLibForNodeTrace(file)) {
        if (existing.has(candidate)) continue;
        if (resolveFromPageDir(pageDir, candidate)) {
          existing.add(candidate);
          toAdd.push(candidate);
          addedDuckdbFiles = true;
        }
      }
    }
  }

  if (isPredictorRoute) {
    const dataRoot = resolveTraceableDataRoot();
    if (!dataRoot) {
      throw new Error(
        "patch-duckdb-nft: predictor route data root missing; run pnpm data:fetch --download before build",
      );
    }

    const dataFiles = walkRegularFiles(dataRoot);
    if (dataFiles.length === 0) {
      throw new Error(`patch-duckdb-nft: no files found under ${dataRoot}`);
    }

    for (const file of dataFiles) {
      const tracePath = tracePathFrom(pageDir, file);
      if (existing.has(tracePath)) continue;
      existing.add(tracePath);
      toAdd.push(tracePath);
      addedDataFiles = true;
    }
  }

  if (toAdd.length === 0) continue;

  trace.files.push(...toAdd);
  fs.writeFileSync(nftPath, JSON.stringify(trace));
  if (addedDuckdbFiles) duckdbPatched += 1;
  if (addedDataFiles) dataPatched += 1;
}

if (duckdbPatched > 0) {
  console.log(
    `patch-duckdb-nft: updated ${duckdbPatched} trace file(s) with libduckdb shared libs`,
  );
}

if (dataPatched > 0) {
  console.log(
    `patch-duckdb-nft: updated ${dataPatched} predictor trace file(s) with data files`,
  );
}
