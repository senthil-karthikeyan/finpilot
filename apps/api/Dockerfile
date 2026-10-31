# ── FinPilot API ──────────────────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV npm_config_store_dir=/pnpm/store
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# Stage 1: build
FROM base AS builder
WORKDIR /app

# Manifests only (best layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install build dependencies for api and shared
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY db/ ./db/

RUN pnpm --filter @finpilot/shared build
RUN pnpm --filter api build

# Stage 2: production dependencies only
FROM base AS prod-deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter api...

# Stage 3: runner (minimal Node.js runtime without pnpm/build tools)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/db ./db

COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/apps/api

EXPOSE 3001
CMD ["/entrypoint.sh"]
