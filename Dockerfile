# syntax=docker/dockerfile:1
# ─── Stage 1: dependency installation ─────────────────────────────────────────
# Install all workspace dependencies so pnpm's virtual store is fully populated.
# This layer is cached as long as lockfile + workspace manifests don't change.
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json                   apps/web/package.json
COPY packages/data/package.json              packages/data/package.json
COPY packages/predictors/package.json        packages/predictors/package.json
COPY packages/data-cli/package.json          packages/data-cli/package.json
COPY packages/data-validation/package.json   packages/data-validation/package.json

RUN pnpm install --frozen-lockfile


# ─── Stage 2: build ───────────────────────────────────────────────────────────
# Fetch the public data release, build Next.js with Turbo, patch DuckDB NFT traces.
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
RUN apk add --no-cache tar

WORKDIR /repo

COPY --from=deps /repo/node_modules          ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/data/node_modules          ./packages/data/node_modules
COPY --from=deps /repo/packages/predictors/node_modules    ./packages/predictors/node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm data:fetch --download

RUN pnpm turbo run build --filter=@ejam/web

RUN node apps/web/scripts/patch-duckdb-nft.mjs


# ─── Stage 3: production runner ───────────────────────────────────────────────
# Minimal image: only the Next.js standalone output + data files.
# next build with outputFileTracingRoot set to monorepo root already traces
# workspace packages into .next/standalone — we just need to add data/ on top.
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static  ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public         ./apps/web/public

# Copy the data directory that was fetched at build time.
# The resolver walks up from cwd to find a directory with data/catalog/releases/,
# so placing it at /app/data satisfies resolveDataRoot() when cwd is /app.
COPY --from=builder --chown=nextjs:nodejs /repo/data ./data

# The standalone server entry point is at apps/web/server.js inside the output
# because outputFileTracingRoot is the monorepo root.
# Set explicit env vars so data-root.ts resolvers never have to walk the fs.
ENV EJAM_DATA_ROOT=/app/data
ENV EJAM_MANIFEST_ROOT=/app/data/catalog/releases
ENV EJAM_REGISTRY_ROOT=/app/data/reference
ENV EJAM_TAXONOMY_ROOT=/app/data/reference/taxonomy

USER nextjs

EXPOSE 3000

# dumb-init reaps zombie processes from Node.js (important in Docker)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
