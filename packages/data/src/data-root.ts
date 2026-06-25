/**
 * resolve repo data/ from process.cwd() — Next.js dev runs with cwd at apps/web
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

let cachedDataRoot: string | null = null;

/** for tests only */
export function _resetDataRootCache(): void {
  cachedDataRoot = null;
}

function hasCatalogDir(dataDir: string): boolean {
  return existsSync(join(dataDir, "catalog", "releases"));
}

export function resolveDataRoot(): string {
  if (process.env.EJAM_DATA_ROOT) {
    return resolve(process.env.EJAM_DATA_ROOT);
  }
  if (cachedDataRoot) return cachedDataRoot;

  let dir = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, "data");
    if (hasCatalogDir(candidate)) {
      cachedDataRoot = candidate;
      return candidate;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  return join(process.cwd(), "data");
}

export function resolveManifestRoot(): string {
  return (
    process.env.EJAM_MANIFEST_ROOT ??
    join(resolveDataRoot(), "catalog", "releases")
  );
}

export function resolveRegistryRoot(): string {
  return process.env.EJAM_REGISTRY_ROOT ?? join(resolveDataRoot(), "reference");
}

export function resolveTaxonomyRoot(): string {
  return (
    process.env.EJAM_TAXONOMY_ROOT ??
    join(resolveDataRoot(), "reference", "taxonomy")
  );
}
