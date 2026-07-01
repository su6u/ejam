import path from "node:path";
import type { NextConfig } from "next";
import { Agentation as AgentationStub } from "./src/lib/agentation-stub";

void AgentationStub;

const monorepoRoot = path.join(import.meta.dirname, "../..");

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Emit a self-contained server to .next/standalone for Docker deployments.
  // The Dockerfile runner stage copies this directory and launches server.js directly.
  output: "standalone",
  // Trace workspace packages + repo-root data/ into serverless bundles.
  // DuckDB libduckdb.{so,dylib}: patched post-build (see scripts/patch-duckdb-nft.mjs) — Turbopack skips includes.
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/predict/[exam_id]": ["data/**/*"],
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
