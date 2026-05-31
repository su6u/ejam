/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
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
  console.log(`patch-duckdb-nft: updated ${patched} trace file(s) with libduckdb shared libs`);
}
