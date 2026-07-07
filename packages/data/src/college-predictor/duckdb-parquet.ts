/**
 * DuckDB parquet reader for server-side index loading
 * uses @duckdb/node-api 1.5.x materialized results + result reader
 */

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export async function readParquetRows<T = Record<string, unknown>>(
  filePath: string,
): Promise<T[]> {
  const { DuckDBInstance } = await import("@duckdb/node-api");
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
