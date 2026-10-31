# ── FinPilot Web (Next.js 16) ────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV npm_config_store_dir=/pnpm/store
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# Stage 1: build
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Manifests only for optimal layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install only web + its workspace deps (shared)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @finpilot/web...

COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

ARG API_URL=http://api:3001
ENV API_URL=$API_URL

RUN pnpm --filter @finpilot/shared build
RUN pnpm --filter @finpilot/web build

# Stage 2: runner (minimal Node.js runtime without pnpm/build tools)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output (traced production node_modules and server.js)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

# Start via the standalone server entry point
CMD ["node", "apps/web/server.js"]
