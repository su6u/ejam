import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DuckDB uses platform-specific .node binaries — must not be bundled by Turbopack
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
};

export default nextConfig;
