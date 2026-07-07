/**
 * Turbopack builds skip outputFileTracingIncludes (no buildTraceContext).
 * NFT traces duckdb.node but not libduckdb.{so,dylib}, which duckdb.node loads via @rpath.
 * Predictor routes also need exam taxonomy YAML and manifest-pinned data files at runtime.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultAppDir = path.join(path.dirname(scriptPath), "..");

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

function walkRegularFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRegularFiles(full, acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
}

function tracePathFromPageDir(pageDir, absolutePath) {
  return path.relative(pageDir, absolutePath).split(path.sep).join("/");
}

function isPredictorRouteNft(nftPath) {
  return nftPath
    .split(path.sep)
    .join("/")
    .endsWith("app/api/predict/[exam_id]/route.js.nft.json");
}

function readLatestManifestDatasetPaths(dataRoot) {
  const releasesDir = path.join(dataRoot, "catalog", "releases");
  if (!fs.existsSync(releasesDir)) return [];

  const manifestFiles = fs
    .readdirSync(releasesDir)
    .filter((name) => /^v\d+\.\d+\.\d+\.json$/.test(name));
  manifestFiles.sort((a, b) => {
    const pa = a.slice(1, -5).split(".").map(Number);
    const pb = b.slice(1, -5).split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  });

  const latest = manifestFiles.at(-1);
  if (!latest) return [];

  const manifest = JSON.parse(
    fs.readFileSync(path.join(releasesDir, latest), "utf8"),
  );
  if (!Array.isArray(manifest.datasets)) return [];
  return manifest.datasets.map((entry) => entry.path);
}

function collectPredictorRuntimeDataFiles(dataRoot) {
  const files = new Set();

  for (const file of walkRegularFiles(
    path.join(dataRoot, "reference", "taxonomy"),
  )) {
    files.add(file);
  }

  for (const relative of [
    path.join("reference", "engineering", "institutes.json"),
    path.join("reference", "engineering", "programs.json"),
  ]) {
    const absolute = path.join(dataRoot, relative);
    if (fs.existsSync(absolute)) files.add(absolute);
  }

  for (const file of walkRegularFiles(
    path.join(dataRoot, "catalog", "releases"),
  )) {
    if (file.endsWith(".json")) files.add(file);
  }

  for (const manifestPath of readLatestManifestDatasetPaths(dataRoot)) {
    const absolute = path.join(dataRoot, manifestPath);
    if (fs.existsSync(absolute)) files.add(absolute);
  }

  return [...files];
}

function stageAppRuntimeData(appDir, repoDataRoot) {
  const appDataRoot = path.join(appDir, "data");
  const runtimeFiles = collectPredictorRuntimeDataFiles(repoDataRoot);

  for (const src of runtimeFiles) {
    const relativePath = path.relative(repoDataRoot, src);
    const dest = path.join(appDataRoot, relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  if (runtimeFiles.length > 0) {
    console.log(
      `patch-duckdb-nft: staged ${runtimeFiles.length} predictor data file(s) under ${path.relative(appDir, appDataRoot) || "data"}`,
    );
  }

  return { appDataRoot, stagedFiles: runtimeFiles.length };
}

function copyAppDataToStandalone(appDataRoot, standaloneDir) {
  if (!fs.existsSync(appDataRoot) || !fs.existsSync(standaloneDir)) {
    return;
  }

  const dest = path.join(standaloneDir, "data");
  fs.cpSync(appDataRoot, dest, { force: true, recursive: true });
  console.log("patch-duckdb-nft: copied staged data into standalone output");
}

function patchPredictorDataTraceFiles(serverDir, appDataRoot) {
  if (!fs.existsSync(appDataRoot)) {
    console.log(
      "patch-duckdb-nft: app data/ not found, skipping predictor data trace patch",
    );
    return { patchedPredictorTraces: 0, addedPredictorDataFiles: 0 };
  }

  const runtimeFiles = collectPredictorRuntimeDataFiles(appDataRoot);
  if (runtimeFiles.length === 0) {
    console.log(
      "patch-duckdb-nft: no predictor runtime data files found to trace",
    );
    return { patchedPredictorTraces: 0, addedPredictorDataFiles: 0 };
  }

  let patchedPredictorTraces = 0;
  let addedPredictorDataFiles = 0;

  for (const nftPath of walkNftFiles(serverDir)) {
    if (!isPredictorRouteNft(nftPath)) continue;

    const trace = JSON.parse(fs.readFileSync(nftPath, "utf8"));
    if (!Array.isArray(trace.files)) continue;

    const pageDir = path.dirname(nftPath);
    const existing = new Set(trace.files);
    const toAdd = [];

    for (const absolutePath of runtimeFiles) {
      const relativeTrace = tracePathFromPageDir(pageDir, absolutePath);
      if (existing.has(relativeTrace)) continue;
      if (!fs.existsSync(path.resolve(pageDir, relativeTrace))) continue;
      toAdd.push(relativeTrace);
    }

    if (toAdd.length === 0) continue;

    trace.files.push(...toAdd);
    fs.writeFileSync(nftPath, JSON.stringify(trace));
    patchedPredictorTraces += 1;
    addedPredictorDataFiles += toAdd.length;
  }

  if (patchedPredictorTraces > 0) {
    console.log(
      `patch-duckdb-nft: updated ${patchedPredictorTraces} predictor trace file(s) with ${addedPredictorDataFiles} data file(s)`,
    );
  }

  return { patchedPredictorTraces, addedPredictorDataFiles };
}

function patchTraceFiles(serverDir) {
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

  return patched;
}

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

function copyStandaloneDuckdbLibraries(standaloneDir, repoRoot) {
  if (!fs.existsSync(standaloneDir)) {
    console.log(
      "patch-duckdb-nft: standalone directory not found, skipping file copy",
    );
    return { copiedCount: 0, missingLibraries: [], standaloneNodeCount: 0 };
  }

  const standaloneNodes = walkFiles(standaloneDir, "duckdb.node");
  console.log(
    `patch-duckdb-nft: found ${standaloneNodes.length} duckdb.node file(s) in standalone`,
  );

  let copiedCount = 0;
  const missingLibraries = [];
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

    let copiedForNode = 0;
    if (fs.existsSync(srcSo)) {
      console.log(`patch-duckdb-nft: copying ${srcSo} -> ${destSo}`);
      fs.copyFileSync(srcSo, destSo);
      copiedCount++;
      copiedForNode++;
    }
    if (fs.existsSync(srcDylib)) {
      console.log(`patch-duckdb-nft: copying ${srcDylib} -> ${destDylib}`);
      fs.copyFileSync(srcDylib, destDylib);
      copiedCount++;
      copiedForNode++;
    }

    if (copiedForNode === 0) {
      missingLibraries.push({
        relativePath,
        attemptedSources: [srcSo, srcDylib],
      });
    }
  }

  console.log(
    `patch-duckdb-nft: copied ${copiedCount} shared library files to standalone`,
  );

  if (missingLibraries.length > 0) {
    const details = missingLibraries
      .map(
        (missing) =>
          `  - ${missing.relativePath} (looked for ${missing.attemptedSources.join(
            " or ",
          )})`,
      )
      .join("\n");
    throw new Error(
      `patch-duckdb-nft: missing libduckdb shared library for ${missingLibraries.length} standalone duckdb.node file(s):\n${details}`,
    );
  }

  return {
    copiedCount,
    missingLibraries,
    standaloneNodeCount: standaloneNodes.length,
  };
}

export function patchDuckdbNft({ appDir = defaultAppDir } = {}) {
  const serverDir = path.join(appDir, ".next/server");
  const standaloneDir = path.join(appDir, ".next/standalone");
  const repoRoot = path.join(appDir, "../..");
  const repoDataRoot = path.join(repoRoot, "data");

  const patched = patchTraceFiles(serverDir);
  if (patched > 0) {
    console.log(
      `patch-duckdb-nft: updated ${patched} trace file(s) with libduckdb shared libs`,
    );
  }

  let staged = {
    appDataRoot: path.join(appDir, "data"),
    stagedFiles: 0,
  };
  if (fs.existsSync(repoDataRoot)) {
    staged = stageAppRuntimeData(appDir, repoDataRoot);
    copyAppDataToStandalone(staged.appDataRoot, standaloneDir);
  } else {
    console.log(
      "patch-duckdb-nft: repo data/ not found, skipping predictor data staging",
    );
  }

  const predictorTrace = patchPredictorDataTraceFiles(
    serverDir,
    staged.appDataRoot,
  );

  return {
    patchedTraceCount: patched,
    stagedPredictorDataFiles: staged.stagedFiles,
    ...predictorTrace,
    ...copyStandaloneDuckdbLibraries(standaloneDir, repoRoot),
  };
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  patchDuckdbNft();
}
