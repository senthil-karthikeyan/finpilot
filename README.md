# FinPilot

**FinPilot** is an internal investment portfolio and financial goal monitoring platform built for wealth management operations and advisory teams.

---

## 1. Quick Start

### Option A: Docker Compose (Recommended)

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and start containers (PostgreSQL 16, NestJS API, Next.js 16 Web)
docker compose up --build
```

- **Web Application:** <http://localhost:3000>
- **REST API Base:** <http://localhost:3001/api/v1>
- **Swagger Documentation:** <http://localhost:3001/api/docs>

> *The API container automatically runs database migrations and seeds the synthetic dataset upon first startup.*

---

### Option B: Local Development (Bare Metal)

#### Prerequisites
- **Node.js:** ≥ 20 (tested on v26.x)
- **pnpm:** 11.10.0 (enforced via `packageManager`)
- **PostgreSQL:** 16 (running on port 5432)

```bash
# 1. Install monorepo dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Run database migrations & seed dataset
pnpm --filter api db:migrate
pnpm --filter api db:seed

# 4. In Terminal 1: Start NestJS REST API
pnpm --filter @finpilot/api dev

# 5. In Terminal 2: Start Next.js Frontend
pnpm --filter @finpilot/web dev
```

---

## 2. Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **VIEWER** | `viewer@finpilot.test` | `Viewer#2026` | Read-only access to customer directories, portfolios, and transactions |
| **ADMIN** | `admin@finpilot.test` | `Admin#2026` | Full access + Operations CSV ingestion, reconciliation, and data quality audits |

*(Demo credentials are automatically hashed via bcrypt and seeded in the database).*

---

## 3. Architecture & Verification

- **Monorepo Layout:**
  - `packages/shared`: Shared Zod schemas, contract types, and domain constants.
  - `apps/api`: NestJS 12, Drizzle ORM, PostgreSQL 16, Pino logger, class-validator.
  - `apps/web`: Next.js 16, React 19, Partial Prerendering (PPR), Turbopack, Tailwind CSS v4, Radix UI.
  - `db/migrations`: Versioned Drizzle SQL migrations.
  - `db/seed`: CSV loader & anomaly reconciliation engine.
  - `db/queries`: Dedicated SQL analysis tasks.
- **Verification Metrics:**
  - **145 Unit & Integration Tests:** 79 in `apps/web` + 66 in `apps/api` (all passing).
  - **TypeScript:** Strict type checking (`tsc --noEmit`) with **zero `any` types**.
  - **Linters:** `oxlint` (API) and `eslint` (Web) with **0 errors and 0 warnings**.
  - **Prerendering:** Next.js 16 Partial Prerendering (`PPR ◐`) across all dynamic customer routes.

---

## 4. Live Operations Rehearsal Walkthrough

Follow this step-by-step checklist to test all features:

1. **Sign In:**
   - Navigate to <http://localhost:3000/login>.
   - Click the "Fill Admin demo credentials" pill, then click "Sign in".
   - You are redirected to `/customers`.
2. **Customer Directory & Search:**
   - Search for `Aarav` or filter by segment `HNI` and KYC status `VERIFIED`.
   - Click on customer `C0001` (Aarav Sharma) to open their overview.
3. **Portfolio Dashboard:**
   - Inspect portfolio total value (`₹`), net cash flow SVG chart, and asset allocation breakdown.
   - Review risk profile gauge (78/100, Aggressive).
   - Click on an account (e.g. `A00001`) to inspect its positions ledger.
4. **Transactions Ledger & Anomaly Detection:**
   - Switch to the **Transactions** tab (`/customers/C0001/transactions`).
   - Observe visual anomaly tags:
     - Pending orders marked in yellow.
     - Reversed transactions with subtle diagonal hash markings.
     - Warning badges for transactions executed before account opened or on closed accounts.
   - Filter by transaction type (`BUY`, `SELL`, `DIVIDEND`, `FEE`) and date range.
5. **Goal Tracking & Date Validation:**
   - Switch to the **Goals** tab (`/customers/C0001/goals`).
   - Click "New goal" to open the creation dialog.
   - Enter name, select a type, set target amount, and verify date validation:
     - Selecting a past date is rejected ("Target date can't be in the past").
     - Selecting today or future date is accepted.
   - Edit an existing goal: modifying the date enforces `>= today`, while leaving the date untouched preserves historical dates.
6. **Operations CSV Ingestion & Reconciliation (Admin Only):**
   - Click **Import CSV** in the sidebar rail (`/admin/imports`).
   - Click "try a small file with mistakes" or drop a transaction CSV.
   - Click "Validate and import".
   - Watch the 4-stage validation stepper complete.
   - Inspect the outcomes summary (Imported, Duplicates skipped, Rejected, Future dated).
   - Filter rows by outcome and click "Download CSV" to export quarantined records.
7. **Data Quality Exceptions:**
   - Click **Data Quality** in the sidebar rail (`/admin/data-quality`).
   - Review real-time counts and handling descriptions for all detected anomalies across the ledger.

---

## 5. Key CLI Commands

```bash
pnpm -r test           # Run all 145 unit and service tests
pnpm -r type-check     # Strict TypeScript verification across all packages
pnpm -r lint           # Run oxlint (api) and eslint (web)
pnpm -r build          # Compile production assets (NestJS build & Next.js PPR)
```

---

## 6. Engineering Decisions

Refer to [`DECISIONS.md`](./DECISIONS.md) for rationale on httpOnly cookie sessions, immutable ledger design, in-ledger anomaly flags vs. quarantine tables, and supply-chain security controls.
