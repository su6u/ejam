/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 * Vercel also resolves platform bindings through hoisted node_modules symlinks, so we
 * materialize duckdb.node + libduckdb next to the path Node actually loads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(appDir, "../..");
const serverDir = path.join(appDir, ".next/server");
const platformArch = `${process.platform}-${process.arch}`;
const platformPackage = `node-bindings-${platformArch}`;

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
  const candidates = [
    path.join(appDir, "node_modules", "@duckdb", platformPackage),
    path.join(repoRoot, "node_modules", "@duckdb", platformPackage),
  ];

  const pnpmRoot = path.join(repoRoot, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmRoot)) {
    for (const entry of fs.readdirSync(pnpmRoot)) {
      if (!entry.startsWith(`@duckdb+${platformPackage}@`)) continue;
      candidates.push(
        path.join(pnpmRoot, entry, "node_modules", "@duckdb", platformPackage),
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

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink()) fs.unlinkSync(targetPath);
  else if (stat.isDirectory())
    fs.rmSync(targetPath, { recursive: true, force: true });
  else fs.unlinkSync(targetPath);
}

function copyFileEnsuringDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function materializeBindingDir(sourceDir, targetDir) {
  removePath(targetDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const copied = [];
  for (const src of bindingFilesForDir(sourceDir)) {
    const dest = path.join(targetDir, path.basename(src));
    copyFileEnsuringDir(src, dest);
    copied.push(dest);
  }

  const packageJson = path.join(targetDir, "package.json");
  if (!fs.existsSync(packageJson)) {
    fs.writeFileSync(
      packageJson,
      `${JSON.stringify(
        {
          name: `@duckdb/${platformPackage}`,
          version: "1.5.2-r.1",
        },
        null,
        2,
      )}\n`,
    );
    copied.push(packageJson);
  }

  return copied;
}

function materializePlatformBindings(sourceDir) {
  const targets = [
    path.join(appDir, "node_modules", "@duckdb", platformPackage),
    path.join(serverDir, "node_modules", "@duckdb", platformPackage),
  ];

  const staged = [];
  for (const target of targets) {
    staged.push(...materializeBindingDir(sourceDir, target));
  }
  return staged;
}

function copySharedLibsBesideTracedNodes(pageDir, traceFiles) {
  const copied = [];
  for (const tracePath of traceFiles) {
    if (!tracePath.endsWith("/duckdb.node")) continue;
    const nodeAbs = resolveFromPageDir(pageDir, tracePath);
    if (!nodeAbs) continue;

    for (const sharedLib of sharedLibForNodeTrace(tracePath)) {
      const sharedAbs = resolveFromPageDir(pageDir, sharedLib);
      if (sharedAbs) continue;

      const destAbs = path.resolve(pageDir, sharedLib);
      const sourceCandidates = bindingFilesForDir(path.dirname(nodeAbs)).filter(
        (filePath) => path.basename(filePath) === path.basename(sharedLib),
      );
      if (sourceCandidates.length === 0) continue;

      copyFileEnsuringDir(sourceCandidates[0], destAbs);
      copied.push(destAbs);
    }
  }
  return copied;
}

function patchTraceFiles(serverDirPath, stagedFiles) {
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

    copySharedLibsBesideTracedNodes(pageDir, trace.files);

    for (const file of trace.files) {
      if (!file.includes("duckdb.node")) continue;
      for (const candidate of sharedLibForNodeTrace(file)) {
        if (existing.has(candidate)) continue;
        if (resolveFromPageDir(pageDir, candidate)) toAdd.push(candidate);
      }
    }

    for (const absPath of [...bindingFiles, ...stagedFiles]) {
      const candidate = toTracePath(pageDir, absPath);
      if (existing.has(candidate)) continue;
      if (!fs.existsSync(absPath)) continue;
      toAdd.push(candidate);
    }

    if (toAdd.length === 0) continue;

    trace.files.push(...toAdd);
    fs.writeFileSync(nftPath, JSON.stringify(trace));
    patched += 1;
  }

  return patched;
}

function assertPlatformBindingsPresent(bindingDirs, stagedFiles) {
  const usesNativeDuckdb = walkNftFiles(serverDir).some((nftPath) => {
    const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));
    return (
      Array.isArray(trace.files) &&
      trace.files.some((file) => file.includes("duckdb"))
    );
  });
  if (!usesNativeDuckdb) return;

  if (bindingDirs.length === 0) {
    throw new Error(
      `patch-duckdb-nft: no @duckdb/${platformPackage} bindings found for traced DuckDB routes`,
    );
  }

  const sharedLibName =
    process.platform === "darwin" ? "libduckdb.dylib" : "libduckdb.so";
  const hasSharedLib = stagedFiles.some(
    (filePath) => path.basename(filePath) === sharedLibName,
  );
  if (!hasSharedLib) {
    throw new Error(
      `patch-duckdb-nft: missing ${sharedLibName} for ${platformPackage} bindings`,
    );
  }
}

const bindingDirs = findPlatformBindingDirs();
const stagedFiles =
  bindingDirs.length > 0 ? materializePlatformBindings(bindingDirs[0]) : [];
const patched = patchTraceFiles(serverDir, stagedFiles);
assertPlatformBindingsPresent(bindingDirs, stagedFiles);

if (stagedFiles.length > 0) {
  console.log(
    `patch-duckdb-nft: materialized ${stagedFiles.length} ${platformPackage} file(s) for runtime resolution`,
  );
}
if (patched > 0) {
  console.log(
    `patch-duckdb-nft: updated ${patched} trace file(s) with libduckdb shared libs (${platformArch})`,
  );
}
