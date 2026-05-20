/**
 * shared JoSAA index loader — loads all rows once per process, caches in module scope
 * DuckDB is created, queried, and closed; not kept alive between calls
 * path resolution: EJAM_DIST_DATA_ROOT env var overrides the default cwd-relative path
 * so the same module works in both local dev (cwd = repo root) and deployed environments
 **/

import { join, resolve } from "node:path";
import type { CollegePredictorIndexRow } from "./engine";

let _cachedJosaaIndex: CollegePredictorIndexRow[] | null = null;

export async function getJosaaIndex(): Promise<CollegePredictorIndexRow[]> {
  if (_cachedJosaaIndex) return _cachedJosaaIndex;

  const indexPath = resolve(
    process.env.EJAM_DIST_DATA_ROOT ?? join(process.cwd(), "data", "dist"),
    "college_predictor_index.parquet",
  );

  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  const result = await connection.run(
    `SELECT * FROM read_parquet('${indexPath}')`,
  );
  const rows = await result.fetchAllRows();
  await connection.close();
  await instance.close();

  _cachedJosaaIndex = rows as unknown as CollegePredictorIndexRow[];
  return _cachedJosaaIndex;
}

/** exposed for tests only — resets the module-level cache */
export function _resetJosaaIndexCache(): void {
  _cachedJosaaIndex = null;
}
