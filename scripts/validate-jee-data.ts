#!/usr/bin/env -S node --experimental-strip-types --no-warnings
/**
 * @deprecated use `pnpm validate:data` (Python: scripts/validate_data.py)
 * validates jee json files against zod schemas and source id integrity checks
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { FILE_SCHEMAS } from "../packages/data/src/schemas/jee";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const TARGET = join(ROOT, "data", "engineering", "jee");

type Hit = { id: string; path: string };
type Parsed = { rel: string; data: unknown; kind: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_raw")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".json")) out.push(full);
  }
  return out;
}

function toPosix(rel: string): string {
  return `/${rel.split(sep).join("/")}`;
}

function collectSourceRefs(node: unknown, path: string[], hits: Hit[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const [i, v] of node.entries())
      collectSourceRefs(v, [...path, String(i)], hits);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "source" && typeof v === "string") {
      hits.push({ id: v, path: [...path, k].join(".") });
    } else {
      collectSourceRefs(v, [...path, k], hits);
    }
  }
}

const files = walk(TARGET);
const parsed: Parsed[] = [];
let failed = 0;
let ok = 0;
let skipped = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  const norm = toPosix(rel);
  const match = FILE_SCHEMAS.find((s) => s.match.test(norm));
  if (!match) {
    console.warn(`SKIP  ${rel}  (no schema mapped)`);
    skipped++;
    continue;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`FAIL  ${rel}  invalid JSON: ${(e as Error).message}`);
    failed++;
    continue;
  }

  const result = match.schema.safeParse(raw);
  if (!result.success) {
    console.error(`FAIL  ${rel}  (${match.kind})`);
    for (const issue of result.error.issues) {
      const where = issue.path.length ? issue.path.join(".") : "<root>";
      console.error(`        ${where}: ${issue.message}`);
    }
    failed++;
    continue;
  }

  console.log(`OK    ${rel}  (${match.kind})`);
  parsed.push({ rel, data: result.data, kind: match.kind });
  ok++;
}

const registry = parsed.find((p) => p.kind === "sources-registry")?.data as
  | { sources: { id: string }[] }
  | undefined;

if (registry) {
  const known = new Set(registry.sources.map((s) => s.id));
  let citationFails = 0;
  for (const { rel, data, kind } of parsed) {
    if (kind === "sources-registry") continue;
    const hits: Hit[] = [];
    collectSourceRefs(data, [], hits);
    for (const { id, path } of hits) {
      if (!known.has(id)) {
        console.error(`FAIL  ${rel}  unknown source.id "${id}" at ${path}`);
        citationFails++;
      }
    }
  }
  if (citationFails > 0) failed += citationFails;
} else {
  console.error("FAIL  no sources registry parsed; cannot run citation check");
  failed++;
}

console.log(`\nsummary: ${ok} ok, ${failed} fail, ${skipped} skip`);
process.exit(failed > 0 ? 1 : 0);
