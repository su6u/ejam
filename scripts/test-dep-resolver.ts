/**
 * smoke test for dependency resolver — loads jee-main config and resolves against real manifest
 * run with: npx tsx scripts/test-dep-resolver.ts
 */

import {
  loadLatestManifest,
  resolveExamDependencies,
} from "../packages/data/src/dependency-resolver/index.js";
import { loadExamConfig } from "../packages/data/src/exam-config/index.js";

const config = loadExamConfig("jee-main");
const manifest = loadLatestManifest();

console.log(
  `manifest: ${manifest.version} (${manifest.datasets.length} datasets)`,
);

// test for year=2025, round=1
const result = resolveExamDependencies({
  examId: config.id,
  dependencies: config.data_dependencies,
  manifest,
  year: 2025,
  round: 1,
});

console.log(`\nexam: ${result.exam_id}`);
console.log(`resolved (${result.resolved.length}):`);
for (const r of result.resolved) {
  console.log(`  ✓ [${r.dataset}] ${r.path}`);
}
console.log(`missing (${result.missing.length}):`);
for (const m of result.missing) {
  console.log(`  ✗ [${m.dataset}] ${m.reason}`);
}
console.log(`\npublishable: ${result.publishable}`);

if (result.missing.length > 0) {
  console.error("unexpected missing deps:", result.missing);
  process.exitCode = 1;
} else {
  console.log("\n✓ all required dependencies resolved");
}
