/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = path.join(appDir, "../..");
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

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
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

function resolveFromPageDir(pageDir, tracePath) {
  const abs = path.resolve(pageDir, tracePath);
  return fs.existsSync(abs) ? abs : null;
}

function tracePathFromPageDir(pageDir, absolutePath) {
  return path
    .relative(pageDir, absolutePath)
    .split(path.sep)
    .join(path.posix.sep);
}

function isPredictRouteTrace(nftPath) {
  return nftPath
    .split(path.sep)
    .join("/")
    .endsWith("/app/api/predict/[exam_id]/route.js.nft.json");
}

function findDataDir() {
  const candidates = [
    path.join(appDir, "data"),
    path.join(monorepoRoot, "data"),
  ];
  return candidates.find((dir) =>
    fs.existsSync(path.join(dir, "manifest")) &&
    fs.existsSync(path.join(dir, "registry")),
  );
}

let duckdbPatched = 0;
let dataPatched = 0;

for (const nftPath of walkNftFiles(serverDir)) {
  const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));
  if (!Array.isArray(trace.files)) continue;

  const usesDuckdb = trace.files.some((f) => f.includes("duckdb"));
  const pageDir = path.dirname(nftPath);
  const existing = new Set(trace.files);
  const toAdd = [];

  if (usesDuckdb) {
    for (const file of trace.files) {
      if (!file.includes("duckdb.node")) continue;
      for (const candidate of sharedLibForNodeTrace(file)) {
        if (existing.has(candidate)) continue;
        if (resolveFromPageDir(pageDir, candidate)) {
          existing.add(candidate);
          toAdd.push(candidate);
          duckdbPatched += 1;
        }
      }
    }
  }

  if (isPredictRouteTrace(nftPath)) {
    const dataDir = findDataDir();
    if (dataDir) {
      for (const file of walkFiles(dataDir)) {
        const tracePath = tracePathFromPageDir(pageDir, file);
        if (existing.has(tracePath)) continue;
        existing.add(tracePath);
        toAdd.push(tracePath);
        dataPatched += 1;
      }
    }
  }

  if (toAdd.length === 0) continue;

  trace.files.push(...toAdd);
  fs.writeFileSync(nftPath, JSON.stringify(trace));
}

if (duckdbPatched > 0) {
  console.log(
    `patch-duckdb-nft: added ${duckdbPatched} libduckdb shared lib trace entry(s)`,
  );
}

if (dataPatched > 0) {
  console.log(
    `patch-duckdb-nft: added ${dataPatched} predictor data trace entry(s)`,
  );
}
