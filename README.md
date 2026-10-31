# FinPilot

Internal investment portfolio and goal monitoring platform — take-home assessment.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 (tested on 26.x) |
| pnpm | 11.10.0 (enforced via `packageManager`) |
| Docker + Compose | any recent version |

## Quick start (Docker)

```bash
cp .env.example .env          # fill in secrets if needed
docker compose up --build     # starts postgres, api, web
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001/api/v1>
- Swagger: <http://localhost:3001/api/docs>

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| VIEWER | `viewer@finpilot.test` | `Viewer#2026` |
| ADMIN | `admin@finpilot.test` | `Admin#2026` |

> Seeded by `db/seed/`. Do **not** use these in production.

## Local development (no Docker)

```bash
pnpm install
# In one terminal — start API
pnpm --filter @finpilot/api dev
# In another terminal — start Web
pnpm --filter @finpilot/web dev
```

Requires a running Postgres instance matching `DATABASE_URL` in `.env`.

## Workspace layout

```
finpilot/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Zod schemas + API contract types shared by api and web
├── db/
│   ├── migrations/   # Drizzle SQL migrations (run in order)
│   ├── seed/         # CSV loader + anomaly-handling seed script
│   └── queries/      # Reviewer SQL queries (SQL tasks from the assignment)
├── .env.example      # Template — copy to .env and fill in secrets
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Useful commands

```bash
pnpm build            # build all workspaces
pnpm lint             # lint all workspaces
pnpm type-check       # TypeScript check all workspaces
pnpm test             # run all tests
pnpm format           # auto-format with Prettier
```

## Supply-chain security

`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days) so pnpm will
refuse to install any package published less than a week ago — a safeguard
against dependency-confusion attacks.

