/**
 * smoke test for exam config kernel — validates jee-main and jee-advanced load cleanly
 * run with: tsx scripts/test-exam-config.ts
 */

import { loadExamConfig } from "../packages/data/src/exam-config/index.js";

const exams = ["jee-main", "jee-advanced"] as const;

for (const examId of exams) {
  try {
    const config = loadExamConfig(examId);
    console.log(`✓ ${examId}`);
    console.log(
      `  categories: ${config.resolved_taxonomies.categories.values.length} values`,
    );
    console.log(
      `  quotas:     ${config.resolved_taxonomies.quotas.values.length} values`,
    );
    console.log(
      `  genders:    ${config.resolved_taxonomies.genders.values.length} values`,
    );
    console.log(`  deps:       ${config.data_dependencies.length}`);
  } catch (err) {
    console.error(`✗ ${examId}:`, (err as Error).message);
    process.exitCode = 1;
  }
}
