import path from "node:path";
import type { NextConfig } from "next";
import { Agentation as AgentationStub } from "./src/lib/agentation-stub";

void AgentationStub;

const monorepoRoot = path.join(import.meta.dirname, "../..");

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Trace runtime-only files that Next's static analysis can miss in serverless bundles.
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/predict/[exam_id]": [
      "data/**/*",
      "../../node_modules/.pnpm/@duckdb+node-api@*/node_modules/@duckdb/node-api/**/*",
      "../../node_modules/.pnpm/@duckdb+node-bindings@*/node_modules/@duckdb/node-bindings/**/*",
      "../../node_modules/.pnpm/@duckdb+node-bindings-linux-x64@*/node_modules/@duckdb/node-bindings-linux-x64/**/*",
    ],
  },
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
