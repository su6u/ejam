import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // DuckDB uses platform-specific .node binaries — must not be bundled by Turbopack
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  turbopack: {
    resolveAlias: isProd
      ? {
          agentation: "./src/lib/agentation-stub.ts",
        }
      : {},
  },
};

export default nextConfig;
