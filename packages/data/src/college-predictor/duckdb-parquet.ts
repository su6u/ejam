/**
 * DuckDB parquet reader for server-side index loading
 * uses @duckdb/node-api 1.5.x materialized results + result reader
 */

import fs from "node:fs";
import path from "node:path";

let nativeBindingPrepared = false;

function duckdbNativeCandidateDirs(): string[] {
  const platformPackage = `node-bindings-${process.platform}-${process.arch}`;
  return [
    path.join(process.cwd(), ".next/node_modules/@duckdb", platformPackage),
    path.join(process.cwd(), "node_modules/@duckdb", platformPackage),
    path.join(
      process.cwd(),
      ".next/server/node_modules/@duckdb",
      platformPackage,
    ),
  ];
}

function duckdbSharedLibName(): string {
  return process.platform === "darwin" ? "libduckdb.dylib" : "libduckdb.so";
}

function prepareNativeDuckdbBinding() {
  if (nativeBindingPrepared) return;
  nativeBindingPrepared = true;

  const sharedLib = duckdbSharedLibName();

  for (const dir of duckdbNativeCandidateDirs()) {
    const nodePath = path.join(dir, "duckdb.node");
    const sharedPath = path.join(dir, sharedLib);
    if (!fs.existsSync(nodePath) || !fs.existsSync(sharedPath)) continue;

    const nodePathEntries = [
      path.join(process.cwd(), ".next/node_modules"),
      path.join(process.cwd(), "node_modules"),
      process.env.NODE_PATH,
    ].filter(Boolean);

    process.env.NODE_PATH = nodePathEntries.join(path.delimiter);

    const libraryPathEntries = [dir, process.env.LD_LIBRARY_PATH].filter(
      Boolean,
    );
    if (process.platform === "linux") {
      process.env.LD_LIBRARY_PATH = libraryPathEntries.join(path.delimiter);
    }

    return;
  }
}

function nativeDuckdbDiagnostics(): string {
  const sharedLib = duckdbSharedLibName();
  const dirs = duckdbNativeCandidateDirs().map((dir) => {
    const nodePath = path.join(dir, "duckdb.node");
    const sharedPath = path.join(dir, sharedLib);
    return `${dir} duckdb.node=${fs.existsSync(nodePath)} ${sharedLib}=${fs.existsSync(sharedPath)}`;
  });

  return [
    `cwd=${process.cwd()}`,
    `NODE_PATH=${process.env.NODE_PATH ?? ""}`,
    `LD_LIBRARY_PATH=${process.env.LD_LIBRARY_PATH ?? ""}`,
    ...dirs,
  ].join(" | ");
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export async function readParquetRows<T = Record<string, unknown>>(
  filePath: string,
): Promise<T[]> {
  prepareNativeDuckdbBinding();
  let DuckDBInstance: typeof import("@duckdb/node-api")["DuckDBInstance"];
  try {
    ({ DuckDBInstance } = await import("@duckdb/node-api"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${message} | ${nativeDuckdbDiagnostics()}`);
  }
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_parquet('${escapeSqlString(filePath)}')`,
    );
    return reader.getRowObjectsJS() as T[];
  } finally {
    connection.closeSync();
  }
}
