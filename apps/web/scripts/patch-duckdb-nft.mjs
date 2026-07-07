/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(appDir, "../..");
const serverDir = path.join(appDir, ".next/server");
const platformArch = `${process.platform}-${process.arch}`;

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
    return [
      nodeTracePath.replace(/duckdb\.node$/, "libduckdb.so"),
      nodeTracePath.replace(/duckdb\.node$/, "libduckdb.dylib"),
    ];
  }
  return [];
}

function resolveFromPageDir(pageDir, tracePath) {
  const abs = path.resolve(pageDir, tracePath);
  return fs.existsSync(abs) ? abs : null;
}

function toTracePath(pageDir, absPath) {
  return path.relative(pageDir, absPath).split(path.sep).join("/");
}

function resolveBindingDir(dir) {
  if (!fs.existsSync(dir)) return null;
  try {
    const real = fs.realpathSync(dir);
    return fs.statSync(real).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

function findPlatformBindingDirs() {
  const packageName = `node-bindings-${platformArch}`;
  const candidates = [
    path.join(appDir, "node_modules", "@duckdb", packageName),
    path.join(repoRoot, "node_modules", "@duckdb", packageName),
  ];

  const pnpmRoot = path.join(repoRoot, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmRoot)) {
    for (const entry of fs.readdirSync(pnpmRoot)) {
      if (!entry.startsWith(`@duckdb+node-bindings-${platformArch}@`)) continue;
      candidates.push(
        path.join(
          pnpmRoot,
          entry,
          "node_modules",
          "@duckdb",
          packageName,
        ),
      );
    }
  }

  const dirs = [];
  for (const candidate of candidates) {
    const resolved = resolveBindingDir(candidate);
    if (resolved && !dirs.includes(resolved)) dirs.push(resolved);
  }
  return dirs;
}

function bindingFilesForDir(bindingDir) {
  const files = [];
  for (const fileName of ["duckdb.node", "libduckdb.so", "libduckdb.dylib"]) {
    const abs = path.join(bindingDir, fileName);
    if (fs.existsSync(abs)) files.push(abs);
  }
  return files;
}

function patchTraceFiles(serverDirPath) {
  let patched = 0;
  const bindingFiles = findPlatformBindingDirs().flatMap(bindingFilesForDir);

  for (const nftPath of walkNftFiles(serverDirPath)) {
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

    for (const absPath of bindingFiles) {
      const candidate = toTracePath(pageDir, absPath);
      if (existing.has(candidate)) continue;
      toAdd.push(candidate);
    }

    if (toAdd.length === 0) continue;

    trace.files.push(...toAdd);
    fs.writeFileSync(nftPath, JSON.stringify(trace));
    patched += 1;
  }

  return patched;
}

const patched = patchTraceFiles(serverDir);
if (patched > 0) {
  console.log(
    `patch-duckdb-nft: updated ${patched} trace file(s) with libduckdb shared libs (${platformArch})`,
  );
}
