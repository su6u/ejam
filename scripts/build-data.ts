#!/usr/bin/env tsx
/**
 * builds dist-data artifacts from data/engineering/jee
 * emits parquet snapshots markdown chunks and manifest with checksums and data_version
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "engineering", "jee");
const DIST_DIR = path.join(ROOT, "dist-data");
const CHUNK_ID_PATTERN = /^[a-z0-9-]+$/;

type FileEntry = {
  path: string;
  hash: string;
  size: number;
};

type Manifest = {
  data_version: string;
  built_at: string;
  git_sha: string;
  files: FileEntry[];
  chunks: FileEntry[];
};

async function sha256File(filePath: string): Promise<string> {
  const data = await fs.readFile(resolveContainedPath(ROOT, filePath));
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isPathInside(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function resolveContainedPath(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  if (!isPathInside(resolvedRoot, resolvedPath)) {
    throw new Error(
      `refusing path outside ${resolvedRoot}: ${segments.join("/")}`,
    );
  }
  return resolvedPath;
}

function assertSafeRelativePath(relativePath: string): void {
  const rawSegments = relativePath.split(/[\\/]+/);
  const normalized = path.normalize(relativePath);
  if (
    normalized === "." ||
    normalized.startsWith("..") ||
    path.isAbsolute(normalized) ||
    rawSegments.includes("..") ||
    normalized.split(path.sep).includes("..")
  ) {
    throw new Error(`unsafe relative path: ${relativePath}`);
  }
}

function toSafeChunkId(value: string): string {
  const slug = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  if (!slug || !CHUNK_ID_PATTERN.test(slug)) {
    throw new Error(`unsafe chunk id: ${value}`);
  }
  return slug;
}

function assertSafeChunkId(id: string): void {
  if (!CHUNK_ID_PATTERN.test(id)) {
    throw new Error(`unsafe chunk id: ${id}`);
  }
}

async function getGitSha(): Promise<string> {
  try {
    const { execSync } = await import("node:child_process");
    const sha = execSync("git rev-parse --short HEAD", {
      cwd: ROOT,
      encoding: "utf-8",
    }).trim();
    return sha;
  } catch {
    return "unknown";
  }
}

async function getDataVersion(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  const sha = await getGitSha();
  return `${datePart}-${sha}`;
}

async function* walkDir(dir: string, basePath = ""): AsyncGenerator<string> {
  if (
    !isPathInside(DATA_DIR, dir) &&
    path.resolve(dir) !== path.resolve(DATA_DIR)
  ) {
    throw new Error(`refusing to walk outside data dir: ${dir}`);
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "." ||
      entry.name === ".." ||
      entry.name.includes(path.sep)
    ) {
      throw new Error(`unsafe directory entry name: ${entry.name}`);
    }
    const fullPath = resolveContainedPath(DATA_DIR, basePath, entry.name);
    const relativePath = path.join(basePath, entry.name);
    assertSafeRelativePath(relativePath);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `refusing to follow symlink in data dir: ${relativePath}`,
      );
    }
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, relativePath);
    } else {
      yield relativePath;
    }
  }
}

async function copyParquetFiles(): Promise<FileEntry[]> {
  const parquetDir = path.join(DIST_DIR, "parquet");
  await fs.mkdir(parquetDir, { recursive: true });

  const entries: FileEntry[] = [];

  for await (const relativePath of walkDir(DATA_DIR)) {
    if (!relativePath.endsWith(".parquet")) continue;

    assertSafeRelativePath(relativePath);
    const srcPath = resolveContainedPath(DATA_DIR, relativePath);
    const destPath = resolveContainedPath(parquetDir, relativePath);

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(srcPath, destPath);

    const hash = await sha256File(srcPath);
    const stat = await fs.stat(srcPath);

    entries.push({
      path: `parquet/${relativePath}`,
      hash,
      size: stat.size,
    });

    console.log(`  [parquet] ${relativePath} (${hash.slice(0, 8)}...)`);
  }

  return entries;
}

type Chunk = {
  id: string;
  title: string;
  content: string;
  source: string;
  kind: string;
};

function getSource(obj: Record<string, unknown>): string {
  if (typeof obj.source === "string") return obj.source;
  if (typeof obj.syllabus_source === "string") return obj.syllabus_source;
  return "unknown";
}

function toDisplayText(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return fallback;
}

function buildExamChunks(data: Record<string, unknown>): Chunk[] {
  const source = getSource(data);
  const chunks: Chunk[] = [
    {
      id: toSafeChunkId(`${data.id}-overview`),
      title: `${data.name} Overview`,
      content: [
        `# ${data.name} (${data.abbreviation})`,
        "",
        `**Conducting Body:** ${data.conducting_body}`,
        `**Official URL:** ${data.official_url}`,
        `**Scope:** ${data.scope}`,
        "",
        `**Languages:** ${(data.languages as string[])?.join(", ") || "N/A"}`,
        `**Frequency:** ${toDisplayText(data.exam_frequency)}`,
      ].join("\n"),
      source,
      kind: "exam-overview",
    },
  ];

  const papers = data.papers as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (papers) {
    for (const [paperKey, paper] of Object.entries(papers)) {
      const structure = paper.structure_per_subject as
        | Record<string, Record<string, unknown>>
        | undefined;
      chunks.push({
        id: toSafeChunkId(`${data.id}-${paperKey}`),
        title: paper.name as string,
        content: [
          `# ${paper.name}`,
          "",
          `**Mode:** ${paper.mode}`,
          `**Duration:** ${paper.duration_minutes} minutes`,
          `**Total Marks:** ${paper.total_marks}`,
          "",
          `**Subjects:** ${(paper.subjects as string[])?.join(", ") || "N/A"}`,
          "",
          structure
            ? `**Structure:** Section A has ${structure.section_a?.questions_per_subject} MCQs, Section B has ${structure.section_b?.questions_per_subject} numerical questions.`
            : "",
        ].join("\n"),
        source: (paper.source as string) || source,
        kind: "exam-paper",
      });
    }
  }

  const eligibility = data.eligibility as Record<string, unknown> | undefined;
  if (eligibility) {
    chunks.push({
      id: toSafeChunkId(`${data.id}-eligibility`),
      title: `${data.abbreviation} Eligibility Criteria`,
      content: [
        `# ${data.abbreviation} Eligibility`,
        "",
        `**Age Limit:** ${eligibility.age_limit}`,
        `**Qualifying Examination:** ${eligibility.qualifying_examination}`,
        eligibility.number_of_attempts
          ? `**Number of Attempts:** ${toDisplayText(eligibility.number_of_attempts)}`
          : "",
        eligibility.year_of_appearance
          ? `**Year of Appearance:** ${toDisplayText(eligibility.year_of_appearance)}`
          : "",
      ].join("\n"),
      source: getSource(eligibility),
      kind: "exam-eligibility",
    });
  }

  return chunks;
}

function buildSyllabusChunks(
  data: Record<string, unknown>,
  kind: string,
): Chunk[] {
  const subjectLines =
    (data.subjects as Array<Record<string, unknown>> | undefined)?.flatMap(
      (subject) => [
        `## ${subject.name}`,
        ...((subject.topics as string[]) || []).map((topic) => `- ${topic}`),
        "",
      ],
    ) || [];

  return [
    {
      id: toSafeChunkId(`${kind}-syllabus`),
      title: "JEE Main Syllabus",
      content: [
        `# ${toDisplayText(data.description, "Syllabus")}`,
        "",
        ...subjectLines,
      ].join("\n"),
      source: getSource(data),
      kind: "syllabus",
    },
  ];
}

function buildRuleStyleChunk(
  data: Record<string, unknown>,
  kind: string,
  itemKind: "business-rules" | "policies",
  fallbackTitle: string,
): Chunk[] {
  const sections = Object.entries(data)
    .filter(([key]) => !["description", "source", "$schema"].includes(key))
    .map(([key, value]) => {
      const val = value as Record<string, unknown>;
      return [
        `## ${key.replaceAll("_", " ").toUpperCase()}`,
        val.description
          ? toDisplayText(val.description, "")
          : JSON.stringify(val, null, 2),
      ].join("\n");
    });

  if (sections.length === 0) return [];

  return [
    {
      id: toSafeChunkId(`${kind}-${itemKind}`),
      title: (data.description as string) || fallbackTitle,
      content: [
        `# ${toDisplayText(data.description, fallbackTitle)}`,
        "",
        ...sections,
      ].join("\n"),
      source: getSource(data),
      kind: itemKind,
    },
  ];
}

function buildAuthorityChunks(data: Record<string, unknown>): Chunk[] {
  return [
    {
      id: toSafeChunkId(`${data.id}-authority`),
      title: `${data.name} (${data.abbreviation})`,
      content: [
        `# ${data.name}`,
        "",
        `**Abbreviation:** ${data.abbreviation}`,
        `**Conducting Body:** ${data.conducting_body}`,
        `**Official URL:** ${data.official_url}`,
        "",
        toDisplayText(data.description, ""),
      ].join("\n"),
      source: getSource(data),
      kind: "counselling-authority",
    },
  ];
}

function buildIitChunks(data: Record<string, unknown>): Chunk[] {
  const iits = (data.iits as Array<Record<string, unknown>> | undefined) || [];
  const chunks: Chunk[] = [
    {
      id: "iits-catalog",
      title: "Indian Institutes of Technology (IITs)",
      content: [
        "# IITs Participating in JEE Advanced",
        `Total: ${data.count} institutes`,
        "",
        ...iits.map(
          (iit) => `- **${iit.name}** (${iit.established}) — ${iit.location}`,
        ),
      ].join("\n"),
      source: getSource(data),
      kind: "institutes-catalog",
    },
  ];

  for (const iit of iits) {
    chunks.push({
      id: toSafeChunkId(`iit-${String(iit.name)}`),
      title: iit.name as string,
      content: [
        `# ${iit.name}`,
        "",
        `**Established:** ${iit.established}`,
        `**Location:** ${iit.location}`,
        "",
        toDisplayText(iit.description, ""),
      ].join("\n"),
      source: getSource(data),
      kind: "institute",
    });
  }

  return chunks;
}

async function jsonToChunks(
  filePath: string,
  relativePath: string,
): Promise<Chunk[]> {
  assertSafeRelativePath(relativePath);
  const safeFilePath = resolveContainedPath(DATA_DIR, relativePath);
  if (path.resolve(filePath) !== safeFilePath) {
    throw new Error(`JSON source path mismatch: ${relativePath}`);
  }
  const content = await fs.readFile(safeFilePath, "utf-8");
  const data = JSON.parse(content) as Record<string, unknown>;
  const kind = path.dirname(relativePath).split("/").pop() || "general";

  if (relativePath.includes("/exam.json")) return buildExamChunks(data);
  if (relativePath.includes("/syllabus.json"))
    return buildSyllabusChunks(data, kind);
  if (relativePath.includes("/business-rules.json")) {
    return buildRuleStyleChunk(data, kind, "business-rules", "Business Rules");
  }
  if (relativePath.includes("/authority.json"))
    return buildAuthorityChunks(data);
  if (relativePath.includes("/iits.json")) return buildIitChunks(data);
  if (relativePath.includes("/policies.json")) {
    return buildRuleStyleChunk(data, kind, "policies", "Policies");
  }

  return [];
}

async function generateMarkdownChunks(): Promise<FileEntry[]> {
  const chunksDir = path.join(DIST_DIR, "chunks");
  await fs.mkdir(chunksDir, { recursive: true });

  const entries: FileEntry[] = [];
  const allChunks: Chunk[] = [];

  for await (const relativePath of walkDir(DATA_DIR)) {
    if (!relativePath.endsWith(".json")) continue;
    if (relativePath.includes("/cutoffs/")) continue;
    if (relativePath.endsWith("_sources.json")) continue;

    assertSafeRelativePath(relativePath);
    const srcPath = resolveContainedPath(DATA_DIR, relativePath);
    const chunks = await jsonToChunks(srcPath, relativePath);
    allChunks.push(...chunks);
  }

  for (const chunk of allChunks) {
    assertSafeChunkId(chunk.id);
    const fileName = `${chunk.id}.md`;
    const destPath = resolveContainedPath(chunksDir, fileName);

    const content = [
      `---`,
      `id: ${chunk.id}`,
      `title: ${chunk.title}`,
      `source: ${chunk.source}`,
      `kind: ${chunk.kind}`,
      `---`,
      "",
      chunk.content,
    ].join("\n");

    await fs.writeFile(destPath, content, "utf-8");

    const hash = await sha256File(destPath);
    const stat = await fs.stat(destPath);

    entries.push({
      path: `chunks/${fileName}`,
      hash,
      size: stat.size,
    });

    console.log(`  [chunk] ${fileName} (${hash.slice(0, 8)}...)`);
  }

  return entries;
}

async function main(): Promise<number> {
  console.log("Building data pipeline...");
  console.log(`Data source: ${DATA_DIR}`);
  console.log(`Output: ${DIST_DIR}`);
  console.log();

  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });

  const dataVersion = await getDataVersion();
  const gitSha = await getGitSha();

  console.log(`Data version: ${dataVersion}`);
  console.log();

  console.log("Copying parquet snapshots...");
  const parquetFiles = await copyParquetFiles();
  console.log(`  → ${parquetFiles.length} parquet files`);
  console.log();

  console.log("Generating markdown chunks for RAG...");
  const chunkFiles = await generateMarkdownChunks();
  console.log(`  → ${chunkFiles.length} chunks`);
  console.log();

  const manifest: Manifest = {
    data_version: dataVersion,
    built_at: new Date().toISOString(),
    git_sha: gitSha,
    files: parquetFiles,
    chunks: chunkFiles,
  };

  const manifestPath = path.join(DIST_DIR, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("Manifest written:");
  console.log(`  ${manifestPath}`);
  console.log();
  console.log("Build complete!");

  return 0;
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
