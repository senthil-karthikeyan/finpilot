# FinPilot — Wealth Operations & Portfolio Monitoring Platform

[![Node Version](https://img.shields.io/badge/node-24.x-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-11.10.0-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

**FinPilot** is a production-minded wealth management operations platform designed for wealth-service advisors and operations teams to monitor consolidated investment portfolios, inspect account holdings, analyze trailing cash flows, track financial goals, and execute idempotent CSV transaction reconciliations.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Project Structure](#2-project-structure)
- [3. Architecture Overview](#3-architecture-overview)
- [4. Prerequisites](#4-prerequisites)
- [5. Environment Configuration](#5-environment-configuration)
- [6. Running with Docker Compose (Recommended)](#6-running-with-docker-compose-recommended)
- [7. Local Bare-Metal Development](#7-local-bare-metal-development)
- [8. Database Setup, Migrations & Seeding](#8-database-setup-migrations--seeding)
- [9. Demo Credentials & Evaluation Instructions](#9-demo-credentials--evaluation-instructions)
- [10. Testing, Linting & Type-Checking](#10-testing-linting--type-checking)
- [11. Troubleshooting Guide](#11-troubleshooting-guide)
- [12. Architecture Documentation & Decision Log](#12-architecture-documentation--decision-log)

---

## 1. Project Overview

FinPilot resolves the operational challenge of fragmented wealth data by synthesizing investment accounts, end-of-day holdings snapshots, transaction ledgers, customer risk profiles, and financial goals into a consolidated, responsive management interface.

### Key Capabilities

- **Customer Directory & Search:** Fast searching and filtering across customer IDs, names, emails, cities, KYC verification statuses, and wealth tiers (Mass, Affluent, HNI) backed by PostgreSQL GIN full-text indexing.
- **Portfolio Valuation & Aggregation:** Real-time calculation of total market value, unrealised profit & loss (P&L), cost basis, and asset-class allocations across Equity, ETFs, Mutual Funds, Bonds, REITs, and G-Secs.
- **Trailing 12-Month Net Cash Flow:** Interactive SVG bar chart showing monthly settled BUY vs. SELL cash flows.
- **Transactions Ledger:** Server-side paginated, filterable transaction table with visual distinctions for settled, pending, reversed, and future-dated orders.
- **Financial Goals Management:** Tracking funded percentages against target amounts with real-time date validation enforcing non-retroactive deadlines.
- **Operations CSV Ingestion & Reconciliation:** Admin-only 4-stage ingestion pipeline with duplicate detection, foreign key validation, future-dated trade tagging, and line-by-line audit reports.
- **Data Quality Audit Dashboard:** Ledger-wide monitoring of data anomalies, including transactions executed before account opening and operations on closed accounts.

### Technology Stack

| Layer                       | Technologies                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                | Next.js 16 (React 19, Turbopack, App Router), Tailwind CSS v4, Radix UI Primitives, TanStack Query v5, Recharts via shadcn/ui |
| **Backend API**             | NestJS 12, Express, Passport JWT, `@nestjs/throttler`, `class-validator`, Pino Logger, Swagger / OpenAPI 3.0                  |
| **Data & ORM**              | PostgreSQL 16 Alpine, Drizzle ORM, Drizzle Kit Migrations, `pg` connection pool                                               |
| **Shared Contracts**        | `@finpilot/shared` (Zod validation schemas, TypeScript contract types, domain constants)                                      |
| **Tooling & Orchestration** | Docker Compose, Multi-stage Dockerfiles (Next.js standalone), pnpm workspaces, Vitest, oxlint, ESLint                         |

---

## 2. Project Structure

FinPilot is organized as a clean, modular pnpm monorepo:

```text
finpilot/
├── apps/
│   ├── api/                        # NestJS 12 REST API application
│   │   ├── Dockerfile              # Multi-stage optimized Docker build (pruned runner)
│   │   ├── entrypoint.sh           # Auto-migration, auto-seed, and start script
│   │   ├── src/
│   │   │   ├── admin/              # CSV ingestion, reconciliation, and audit service
│   │   │   ├── auth/               # Passport JWT strategy, bcrypt, and role guards
│   │   │   ├── customers/          # Customer profile and search controller
│   │   │   ├── database/           # Drizzle connection, migrations, and seed logic
│   │   │   ├── goals/              # Financial goals CRUD controller and service
│   │   │   ├── portfolio/          # Portfolio aggregation and cash-flow service
│   │   │   ├── transactions/       # Paginated transactions ledger controller
│   │   │   └── main.ts             # API bootstrap, CORS, Throttler, and Swagger config
│   │   └── test/                   # API integration and service unit tests (Vitest)
│   └── web/                        # Next.js 16 App Router frontend application
│       ├── Dockerfile              # Multi-stage Dockerfile with Next.js standalone output
│       ├── next.config.ts          # Standalone output and Turbopack configuration
│       ├── src/
│       │   ├── app/                # Next.js App Router pages and route handlers
│       │   │   ├── admin/          # CSV import stepper and data quality audit pages
│       │   │   ├── api/[...path]/  # Secure server-side proxy route to NestJS API
│       │   │   ├── customers/      # Directory, portfolio, positions, txs, and goals pages
│       │   │   ├── login/          # Demo authentication page with credential pills
│       │   │   └── logout/         # Server-side cookie invalidation route handler
│       │   ├── components/         # Modular Radix UI and Tailwind CSS components
│       │   ├── hooks/              # TanStack Query custom data hooks
│       │   ├── lib/                # API client, formatters, and auth-error-handler
│       │   └── providers/          # QueryClientProvider and AuthProvider
│       └── __tests__/              # Frontend unit and formatter tests (Vitest)
├── packages/
│   └── shared/                     # Single source of truth for schemas & contracts
│       ├── src/
│       │   ├── constants/          # Asset classes, transaction types, goal types, roles
│       │   ├── schemas/            # Zod schemas (auth, customer, goal, import, tx)
│       │   └── types/              # TypeScript API request/response DTO contracts
├── db/
│   ├── migrations/                 # Versioned Drizzle SQL migration files
│   ├── queries/                    # Reviewer SQL analysis queries (AUM, flows, etc.)
│   └── seed/                       # Raw synthetic CSV data files and seed documentation
├── docs/
│   ├── architecture/               # Architecture diagrams (.png, .mmd) and README
│   │   ├── system-architecture.png # Overall topology diagram
│   │   ├── database-erd.png        # Relational database ERD
│   │   ├── backend-request-flow.png# NestJS request pipeline flowchart
│   │   ├── authentication-flow.png # Session, cookie proxy, and JWT lifecycle
│   │   ├── full-stack-data-flow.png# End-to-end CSV ingestion trace
│   │   ├── README.md               # Architecture documentation guide
│   │   └── *.mmd                   # Editable Mermaid source specifications
│   └── IMPLEMENTATION_PLAN.md      # Detailed engineering requirements & anomaly audit
├── docker-compose.yml              # Local container orchestration with healthchecks
├── DECISIONS.md                    # Architecture Decision Records (ADRs) & rejected proposals
├── pnpm-workspace.yaml             # Workspace definition and supply-chain safety rules
└── package.json                    # Monorepo root scripts (build, lint, test, type-check)
```

---

## 3. Architecture Overview

FinPilot employs a defense-in-depth architecture separating client state, frontend server proxying, API business logic, and relational persistence:

![System Architecture](docs/architecture/system-architecture.png)

> [!NOTE]
> For detailed flowcharts of the database schema, backend request pipeline, authentication lifecycle, and full-stack data trace, see [docs/architecture/README.md](./docs/architecture/README.md). Editable Mermaid source is maintained in [`docs/architecture/system-architecture.mmd`](./docs/architecture/system-architecture.mmd).

---

## 4. Prerequisites

To run FinPilot, ensure the following prerequisites are installed on your machine:

| Requirement          | Docker Workflow                             | Bare-Metal Development                             |
| -------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Operating System** | macOS, Linux, or Windows (WSL2 recommended) | macOS, Linux, or Windows                           |
| **Container Engine** | Docker Engine 24+ & Docker Compose v2+      | _Not required_                                     |
| **Node.js**          | _Bundled in container (Node 22-slim)_       | Node.js **20.x, 22.x, or 24.x**                    |
| **Package Manager**  | _Not required for runtime_                  | `pnpm` **11.10.0** (enforced via `packageManager`) |
| **Database**         | _Bundled in container (postgres:16-alpine)_ | Local PostgreSQL **16** running on port 5432       |

---

## 5. Environment Configuration

FinPilot uses `.env.example` as a template for all environment configuration. Create your local `.env` file from the example:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable                     | Required      | Default / Example                                         | Purpose                                                        |
| ---------------------------- | ------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`               | **Yes**       | `postgresql://finpilot:finpilot@localhost:5432/finpilot`  | PostgreSQL connection string for Drizzle ORM and migrations    |
| `JWT_SECRET`                 | **Yes**       | `finpilot-super-secure-production-jwt-secret-key-32chars` | Symmetric cryptographic key used to sign and verify JWT tokens |
| `JWT_COOKIE_MAX_AGE_SECONDS` | No            | `28800` (8 hours)                                         | Token expiration and session cookie maximum age                |
| `PORT`                       | No            | `3001`                                                    | Local port for NestJS REST API server                          |
| `NODE_ENV`                   | No            | `development`                                             | Runtime environment (`development`, `production`, `test`)      |
| `CORS_ORIGIN`                | No            | `http://localhost:3000`                                   | Allowed CORS origin for browser requests                       |
| `API_URL`                    | **Yes** (Web) | `http://localhost:3001`                                   | Upstream backend URL consumed server-side by Next.js proxy     |
| `POSTGRES_USER`              | Docker        | `finpilot`                                                | PostgreSQL container superuser name                            |
| `POSTGRES_PASSWORD`          | Docker        | `finpilot`                                                | PostgreSQL container superuser password                        |
| `POSTGRES_DB`                | Docker        | `finpilot`                                                | Default PostgreSQL database name                               |

> [!CAUTION]
> Never commit real secrets, private keys, or production passwords to version control. FinPilot includes pre-commit checks and `.gitignore` patterns preventing `.env` commits.

---

## 6. Running with Docker Compose (Recommended)

FinPilot is engineered for a **one-command startup** experience. Docker Compose automatically orchestrates database healthchecks, schema migrations, synthetic dataset seeding, and application startup in the correct sequence.

### One-Command Startup

```bash
docker compose up --build
```

### Startup Sequence & Healthcheck Verification

1. **PostgreSQL (`finpilot-postgres`) starts:** Exposes port `5432`. It runs an automated healthcheck using `pg_isready -U finpilot -d finpilot` every 5 seconds.
2. **API (`finpilot-api`) waits for healthy DB:** Configured with `depends_on: postgres: condition: service_healthy`. Once PostgreSQL responds healthy:
   - Executes `node dist/database/migrate.js` to create the full relational schema and views.
   - Executes `node dist/database/seed.js` to ingest synthetic CSVs, resolve data anomalies, and seed demo accounts.
   - Starts NestJS REST API server on port `3001`.
3. **Frontend (`finpilot-web`) starts:** Connects to the API at `http://api:3001` and serves the Next.js application on port `3000`.

### Application URLs

| Service               | Local URL                        | Description                                       |
| --------------------- | -------------------------------- | ------------------------------------------------- |
| **Web Frontend**      | <http://localhost:3000>          | Next.js 16 Wealth Operations & Admin Web App      |
| **REST API Base**     | <http://localhost:3001/api/v1>   | NestJS REST API Version 1                         |
| **Swagger / OpenAPI** | <http://localhost:3001/api/docs> | Interactive OpenAPI Documentation & Testing UI    |
| **Health Check**      | <http://localhost:3001/health>   | Health status endpoint (DB connectivity & uptime) |

### Stopping Services & Inspecting Logs

```bash
# View real-time logs across all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f api
docker compose logs -f web

# Stop containers gracefully (preserves database data)
docker compose down

# Stop containers and reset database volume to clean state
docker compose down -v
```

---

## 7. Local Bare-Metal Development

If you prefer running services directly on your host machine without Docker:

```bash
# 1. Install monorepo dependencies
pnpm install

# 2. Set up environment configuration
cp .env.example .env

# 3. Ensure local PostgreSQL is running on port 5432, then run migrations and seed
pnpm db:migrate
pnpm db:seed

# 4. In Terminal 1: Start NestJS API in watch mode
pnpm --filter @finpilot/api dev

# 5. In Terminal 2: Start Next.js Frontend in Turbopack watch mode
pnpm --filter @finpilot/web dev
```

---

## 8. Database Setup, Migrations & Seeding

### Schema & Migrations

The relational schema is defined declaratively in `apps/api/src/database/schema/` using Drizzle ORM.

- **Run Migrations:**
  ```bash
  pnpm db:migrate
  ```
  Applies `db/migrations/0000_slow_wraith.sql`, creating tables, check constraints, GIN indexes, foreign keys, and analytical views (`v_portfolio_positions`, `v_monthly_net_flows`).

### Synthetic Dataset Seeding & Anomaly Handling

- **Run Seed:**
  ```bash
  pnpm db:seed
  ```
  The seed pipeline ingests raw synthetic CSVs from `db/seed/data/` or `docs/` and handles known data anomalies:
  - **Duplicate Natural Keys:** Deduplicates `holdings_snapshot` on `(account_id, instrument_id, snapshot_date)` and skips duplicate transaction `T0000026`.
  - **Invalid Foreign Keys:** Rejects transaction `T0004551` (`UNKNOWN_INSTRUMENT: I9999`) and logs rejection to `import_rows`.
  - **Negative Fee Amount:** Rejects transaction `T0004552` (`NEGATIVE_AMOUNT: -75.00`).
  - **Future-Dated Trades:** Ingests transaction `T0004553` (dated `2027-01-05`) into the main ledger with `is_future = true`.
  - **Demo Users:** Creates `viewer@finpilot.test` and `admin@finpilot.test` with bcrypt hashed passwords (`cost=10`).

### Reviewer SQL Queries

The `db/queries/` directory includes standalone SQL files for evaluation:

```bash
# Top 10 customers by snapshot AUM
psql $DATABASE_URL -f db/queries/01_top_customers_by_aum.sql

# Asset-class allocation across dataset
psql $DATABASE_URL -f db/queries/02_asset_class_allocation.sql

# Monthly BUY/SELL net cash flow (12-month trailing)
psql $DATABASE_URL -f db/queries/03_monthly_net_flows.sql

# Top instruments by holder count
psql $DATABASE_URL -f db/queries/04_top_instruments.sql

# High-priority goals below 25% funded
psql $DATABASE_URL -f db/queries/05_underfunded_high_priority_goals.sql

# Data-quality exceptions audit
psql $DATABASE_URL -f db/queries/06_data_quality_exceptions.sql

# EXPLAIN (ANALYZE, BUFFERS) query plan
psql $DATABASE_URL -f db/queries/07_explain_analyze_plan.sql
```

---

## 9. Demo Credentials & Evaluation Instructions

### Demo Credentials — For Assignment Evaluation Only

| Role       | Email                  | Password      | Access Rights                                                                           |
| ---------- | ---------------------- | ------------- | --------------------------------------------------------------------------------------- |
| **VIEWER** | `viewer@finpilot.test` | `Viewer#2026` | Read-only access to customer search, portfolios, positions, transactions, and goals     |
| **ADMIN**  | `admin@finpilot.test`  | `Admin#2026`  | Full access + Operations CSV Ingestion, reconciliation reports, and data quality audits |

> [!WARNING]
> **Security Notice:**
> These credentials are provided exclusively for local development and assignment evaluation. They must not be used in production. Production environments must use securely provisioned user accounts and must never expose credentials in README files, source code, or public documentation.

---

### Step-by-Step Evaluation Walkthrough

Follow this verification checklist to evaluate all assignment requirements:

1. **Sign In:**
   - Open <http://localhost:3000/login>.
   - Click the **"Fill Admin demo credentials"** pill (or Viewer pill).
   - Click **"Sign in"**. The browser receives a secure `httpOnly` cookie and redirects to `/customers`.
2. **Customer Directory & Full-Text Search:**
   - In the search bar, search for `Aarav` or `C0001`.
   - Filter by Segment: `HNI` and KYC Status: `VERIFIED`.
   - Click customer `C0001` (Aarav Sharma) to open their consolidated portfolio dashboard.
3. **Portfolio Dashboard & Valuation:**
   - Inspect the **Total Market Value**, **Unrealised P&L**, and **Cost Basis**.
   - Review the **Asset Allocation chart** (Equity, Mutual Funds, Bonds, etc.).
   - Review the **Trailing 12-Month Net Cash Flow chart** showing monthly net BUY/SELL activity.
   - Review the **Risk Profile card** showing score (78/100, Aggressive).
4. **Positions Breakdown:**
   - Switch to the **Positions** tab (`/customers/C0001/positions`).
   - Verify per-position quantity, average cost, latest synthetic price, market value, and unrealised gain/loss percentage.
5. **Transactions Ledger & Anomaly Badges:**
   - Switch to the **Transactions** tab (`/customers/C0001/transactions`).
   - Observe visual anomaly tags:
   - `SETTLED` (standard neutral badge).
   - `PENDING` (amber warning badge).
   - `REVERSED` (diagonal hash-pattern badge).
   - `Future-dated` (indigo badge for trades dated in the future).
   - Test server-side filtering by transaction type (`BUY`, `SELL`, `DIVIDEND`, `FEE`) and date range.
6. **Financial Goals Tracking & Date Validation:**
   - Switch to the **Goals** tab (`/customers/C0001/goals`).
   - Click **"New goal"**.
   - Enter name, select type (`EDUCATION`), set target amount `₹500,000`.
   - Try selecting a past date: verify validation error ("Target date can't be in the past").
   - Select a future date and save. Verify the new goal appears with calculated funded percentage.
7. **Operations CSV Ingestion (Admin Only):**
   - Click **"Import CSV"** in the sidebar rail (`/admin/imports`).
   - Click the test helper button **"Try a small file with mistakes"** (or upload a custom CSV).
   - Click **"Validate and import"**.
   - Watch the 4-stage stepper complete:
     - Stage 1: File parsed.
     - Stage 2: Schema & types validated.
     - Stage 3: Accounts and instruments verified.
     - Stage 4: Ingestion committed.
   - Review the outcomes summary (Imported, Duplicates skipped, Rejected, Future dated).
   - Click **"Download CSV"** to export the quarantined rows with exact error reasons.
8. **Swagger API Testing (Bearer Auth):**
   - Open <http://localhost:3001/api/docs>.
   - Execute `GET /customers/C0001/portfolio` without authorization: observe `401 Unauthorized`.
   - Log in via `POST /auth/login` in Swagger, copy the returned `accessToken`.
   - Click **"Authorize"** at the top of Swagger, paste the token as Bearer, and re-execute: observe `200 OK`.

---

## 10. Testing, Linting & Type-Checking

FinPilot maintains an extensive test suite and strict type-safety standards.

### Test Commands

```bash
# Run all unit and service tests across all packages (159 tests passing)
pnpm -r test

# Run backend API tests only (71 tests in apps/api)
pnpm --filter @finpilot/api test

# Run frontend web tests only (88 tests in apps/web)
pnpm --filter @finpilot/web test

# Run strict TypeScript verification (zero type errors)
pnpm -r type-check

# Run linters (oxlint for API + ESLint for Web)
pnpm -r lint

# Compile production builds (NestJS build + Next.js standalone)
pnpm -r build
```

---

## 11. Troubleshooting Guide

### 1. PostgreSQL Container Fails to Start or Port Conflict (Port 5432)

- **Symptom:** Docker Compose reports `bind: address already in use` or container exits immediately.
- **Remedy:** A local PostgreSQL instance may already be occupying port 5432. Stop the local service (`sudo systemctl stop postgresql` on Linux or stop the PostgreSQL Windows Service), or edit `docker-compose.yml` to map host port `'5433:5432'` and update `DATABASE_URL` in `.env`.

### 2. NestJS API Reports Database Connection Refused on Startup

- **Symptom:** `finpilot-api` logs `connection to server at "postgres" (172.x.x.x), port 5432 failed: Connection refused`.
- **Remedy:** Ensure the `postgres` container has completed its initial initialization. `docker-compose.yml` uses `condition: service_healthy` to prevent API boot until PostgreSQL is accepting queries. If starting manually on bare-metal, ensure PostgreSQL is running before starting the API.

### 3. Migrations or Seed Script Fail with Table Already Exists

- **Symptom:** `error: relation "customers" already exists`.
- **Remedy:** Drizzle migrations use `IF NOT EXISTS` syntax and migration tracking tables (`__drizzle_migrations`). To completely reset your database to a fresh state, run:
  ```bash
  docker compose down -v
  docker compose up --build
  ```

### 4. Next.js Frontend Shows 401 Unauthorized or Session Expired Immediately

- **Symptom:** Logging in redirects back to `/login` or shows a "Session expired" toast.
- **Remedy:**
  1. Ensure both frontend (`http://localhost:3000`) and backend (`http://localhost:3001`) are running.
  2. Verify that `API_URL=http://localhost:3001` is set in your `.env` so the Next.js server proxy can reach the backend.
  3. Ensure your browser allows same-site cookies on localhost.

### 5. Swagger UI Authorize Modal Issues

- **Symptom:** Pasting a token into Swagger Authorize does not work or returns 401.
- **Remedy:** Ensure you paste only the raw JWT string into Swagger's Bearer auth input (or with prefix `Bearer <token>` depending on Swagger UI version). The API enforces strict header extraction: `Authorization: Bearer <jwt>`.

---

## 12. Architecture Documentation & Decision Log

- **Comprehensive Architecture Documentation:** [`docs/architecture/README.md`](./docs/architecture/README.md)
  - [System Topology Diagram (PNG)](./docs/architecture/system-architecture.png) ([`.mmd source`](./docs/architecture/system-architecture.mmd))
  - [Database Entity Relationship Diagram (ERD) (PNG)](./docs/architecture/database-erd.png) ([`.mmd source`](./docs/architecture/database-erd.mmd))
  - [Backend Request Lifecycle Diagram (PNG)](./docs/architecture/backend-request-flow.png) ([`.mmd source`](./docs/architecture/backend-request-flow.mmd))
  - [Authentication & Authorization Lifecycle Diagram (PNG)](./docs/architecture/authentication-flow.png) ([`.mmd source`](./docs/architecture/authentication-flow.mmd))
  - [Full-Stack Data Persistence Flow Diagram (PNG)](./docs/architecture/full-stack-data-flow.png) ([`.mmd source`](./docs/architecture/full-stack-data-flow.mmd))
- **Architecture Decision Records (ADRs):** [`DECISIONS.md`](./DECISIONS.md)
  - Includes full rationale for session cookie proxying, pure Bearer API auth, in-ledger anomaly flags vs. quarantine tables (**REJECTED**), numeric precision, and Next.js standalone container optimization.
- **Database Migrations & SQL Analysis Queries:** [`db/README.md`](./db/README.md)
