# ── FinPilot API ──────────────────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV npm_config_store_dir=/pnpm/store
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# Stage 1: build
FROM base AS builder
WORKDIR /app

# Manifests only (best layer caching). web's package.json stays so the
# frozen-lockfile check passes, but its dependencies are NOT installed.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install only api + its workspace deps (shared)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY db/ ./db/

RUN pnpm --filter @finpilot/shared build
RUN pnpm --filter api build

# Stage 2: runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/db ./db

WORKDIR /app/apps/api

# Strip Windows CRLF line endings, which otherwise break the shebang
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
CMD ["/entrypoint.sh"]