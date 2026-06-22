import * as fs from "node:fs/promises";
import { DuckDBInstance } from "@duckdb/node-api";

export async function runDuckDbSqlFile(sqlFile: string): Promise<void> {
  const sql = await fs.readFile(sqlFile, "utf-8");
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    await connection.run(sql);
  } finally {
    connection.closeSync();
  }
}
