# FinPilot — Architecture & Engineering Decisions (`DECISIONS.md`)

This document records the foundational architecture, security, database design, technology choices, and engineering trade-offs established across FinPilot.

---


## Decision Status Legend

- **Implemented:** Adopted, verified in code, and active in production.
- **Accepted:** Agreed upon for implementation.
- **Proposed:** Under consideration for future enhancements.
- **Rejected:** Formally evaluated and rejected with documented rationale.

---

## 1. Overall Monorepo & System Architecture


### ADR-01: pnpm Workspaces Monorepo Layout

- **Context:** FinPilot requires strict separation between backend business logic, frontend presentation, and shared domain validation rules, while avoiding duplicated TypeScript type definitions.
- **Decision:** Implement a `pnpm` workspaces monorepo (v11.10.0) containing:
  - `packages/shared`: Shared Zod validation schemas, TypeScript contract types, and constants.
  - `apps/api`: NestJS 12 REST API with Drizzle ORM and PostgreSQL 16.
  - `apps/web`: Next.js 16 (React 19) App Router frontend.
  - `db`: Versioned migrations, seeds, and SQL reviewer queries.
- **Rationale:** Pnpm provides symlink-based strict node_modules isolation, blazing fast caching, deterministic lockfiles, and native workspace filtering (`--filter`).
- **Consequences:** Eliminates schema drift between client and server. Build ordering requires `@finpilot/shared` to be compiled before dependent apps.
- **Status:** **Implemented**

---


## 2. Technology Choices

### ADR-02: NestJS 12 for REST API

- **Context:** The backend requires clean modular boundaries, structured dependency injection, declarative validation, OpenAPI documentation, and testability.
- **Decision:** Use NestJS 12 with Express adapter, Drizzle ORM, Passport JWT, and `@nestjs/throttler`.
- **Rationale:** NestJS enforces clean architectural patterns (Controllers -> Services -> Repositories), provides first-class support for guards, filters, interceptors, and generates OpenAPI 3.0 specifications automatically.
- **Consequences:** Slight framework boilerplate compared to minimal frameworks (Express/Fastify bare), but drastically improves long-term maintainability and test isolation.
- **Status:** **Implemented**

### ADR-03: Next.js 16 (React 19) App Router with Partial Prerendering (PPR)

- **Context:** The frontend needs responsive, accessible dashboards for wealth management operators, combining instant shell rendering with dynamic streaming of account and portfolio data.
- **Decision:** Adopt Next.js 16 with React 19, Turbopack, Tailwind CSS v4, and Radix UI primitives. Enable Partial Prerendering (`ppr: true`) with `<Suspense>` boundaries.
- **Rationale:** PPR provides instant first-contentful paint of navigation rails and headers while streaming heavy customer portfolio and transaction tables asynchronously.
- **Consequences:** Dynamic route parameters in App Router require proper `<Suspense>` wrappers to prevent hydration mismatches.
- **Status:** **Implemented**

### ADR-04: Chart Composition — Radix UI + shadcn/ui + Recharts

- **Context:** Visualizing asset-class allocation and trailing 12-month net cash flow requires interactive, accessible SVG charting.
- **Decision:** Utilize shadcn/ui chart composition wrappers (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`) wrapping Recharts primitives (`BarChart`, `PieChart`, `Cell`).
- **Rationale:** Combines the flexible SVG rendering of Recharts with the CSS variable theming and accessible styling of Radix UI / Tailwind CSS v4.
- **Consequences:** Avoids custom D3 canvas rendering while meeting all visual token requirements from `docs/finpilot-mock.html`.
- **Status:** **Implemented**

---


## 3. Authentication & Security Architecture


### ADR-05: Session Ownership in Next.js Server Proxy with Pure Bearer API

- **Context:** Cookies are shared across ports on `localhost` (port 3000 and 3001). When the API extracted tokens from cookies, Swagger UI was unable to authenticate independently via Authorization headers, and the API was tightly coupled to browser cookie conventions.
- **Decision:**
  1. The Next.js frontend application strictly owns user sessions. After receiving `{ accessToken, user }` from `POST /auth/login`, Next.js route handlers store the JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie (`finpilot_token`).
  2. The browser never communicates with the API directly and cannot read the token via JavaScript (`document.cookie`).
  3. A Next.js server-side API proxy (`/api/[...path]` and `proxy.ts`) reads the `httpOnly` cookie and attaches `Authorization: Bearer <token>` to upstream API calls.
  4. The NestJS API authenticates **exclusively** via the `Authorization: Bearer <jwt>` header and never reads or sets cookies.
- **Rationale:** Protects against XSS token theft in the browser, decouples the REST API from cookie mechanics, and enables Swagger UI / third-party tools to authenticate cleanly via the standard `Authorize` modal.
- **Consequences:** All browser requests to the backend route through the Next.js server proxy.
- **Status:** **Implemented**

### ADR-06: Global 401 Session Interception via TanStack Query

- **Context:** If the session cookie expires or is cleared mid-session, asynchronous client requests fail, potentially leaving users in a broken UI state.
- **Decision:** Implement a global TanStack Query `QueryCache` and `MutationCache` error handler (`auth-error-handler.ts`). On encountering an HTTP 401 status, it displays a Sonner toast notification ("Session expired. Please log in again.") and smoothly redirects to `/login`.
- **Rationale:** Centralizes authentication error handling in one place rather than repeating redirects across every page and component.
- **Consequences:** Requires custom toast debounce to prevent duplicate toasts if multiple queries fail simultaneously on session expiration.
- **Status:** **Implemented**

### ADR-07: API Rate Limiting & Throttling

- **Context:** Protecting authentication and public endpoints from brute-force credential stuffing and denial of service.
- **Decision:** Configure `@nestjs/throttler` with:
  - Global tier: 100 requests per 60 seconds per IP.
  - Login tier: 5 requests per 60 seconds per IP on `POST /auth/login`.
- **Rationale:** Mitigates brute-force attacks against seeded demo user credentials without hindering normal wealth operations workflows.
- **Consequences:** Exceeding threshold triggers `429 Too Many Requests`.
- **Status:** **Implemented**

---

## 4. Database & Anomaly Reconciliation Strategy

### ADR-08: Drizzle ORM with PostgreSQL 16

- **Context:** The application needs relational schema definitions, migration versioning, strict type safety, zero runtime overhead, and complex SQL views for financial aggregation.
- **Decision:** Use Drizzle ORM (`drizzle-orm/node-postgres`) with versioned Drizzle Kit SQL migrations.
- **Rationale:** Unlike heavy ORMs (such as Prisma or TypeORM), Drizzle generates raw SQL-like TypeScript queries, has zero query engine overhead, directly supports PostgreSQL `NUMERIC` types, and natively queries views (`v_portfolio_positions`, `v_monthly_net_flows`).
- **Consequences:** Developers write SQL-aligned query builders with full TypeScript inference.
- **Status:** **Implemented**

### ADR-09: Numeric Precision for Financial Calculations

- **Context:** Floating-point representations (IEEE 754) cause rounding errors when aggregating currency values and asset shares.
- **Decision:** Model all financial figures using exact PostgreSQL types:
  - Currency amounts (`amount`, `price`, `target_amount`, `current_funded_amount`): `numeric(18, 2)` or `numeric(18, 4)`.
  - Asset quantities (`quantity`): `numeric(18, 6)`.
- **Rationale:** Ensures arithmetic precision across all market valuation and cash-flow reporting.
- **Consequences:** DTOs and database models treat values as strings or BigNumber-safe objects during JSON serialization.
- **Status:** **Implemented**

### ADR-10: In-Ledger Anomaly Flagging vs. Quarantine Tables

- **Context:** The synthetic transaction dataset contains anomalies, including future-dated trades (`T0004553` on 2027-01-05), transactions dated before account opening (1,069 rows), and transactions on closed accounts (116 rows).
- **Decision:** Preserve all transactions in the unified `transactions` ledger using boolean anomaly flags:
  - `is_future = true`: Trade date exceeds synthetic system date (`2026-10-31`).
  - `before_open_flag = true`: Trade date precedes account `opened_at`.
  - `on_closed_flag = true`: Trade executed against a `CLOSED` account.
  - Analytical views (`v_monthly_net_flows`) dynamically exclude future-dated rows (`WHERE NOT is_future`).
- **Rationale:** Maintains an immutable, unbroken audit ledger without fracturing data across separate tables or introducing distributed join complexity.
- **Consequences:** Queries calculating historical cash flows must explicitly filter on `NOT is_future`.
- **Status:** **Implemented**

### ADR-11: Holdings Snapshot Deduplication

- **Context:** The raw synthetic dataset includes 3 duplicate holding pairs with matching account, instrument, and date.
- **Decision:** Define a composite primary key on `holdings_snapshot(account_id, instrument_id, snapshot_date)`. During CSV seeding, deduplicate records by natural key rather than summing quantities.
- **Rationale:** Enforces data integrity at the database engine level and guarantees idempotent seeding.
- **Consequences:** Duplicate entries in source CSV files are collapsed onto their latest valid state.
- **Status:** **Implemented**

### ADR-12: Line-by-Line Ingestion Audit (`import_rows`)

- **Context:** Operations admins uploading CSV files need visibility into why specific rows were rejected, skipped, or accepted.
- **Decision:** Persist all batch ingestion operations in `import_batches` and audit every row outcome in `import_rows` (`outcome IN ('imported', 'future_dated', 'duplicate', 'rejected')`) with `error_code`, `error_message`, and JSON payload.
- **Rationale:** Provides complete traceability for data quality audits and allows admins to download quarantined rows for review.
- **Consequences:** Introduces insert overhead during batch ingestion, mitigated by chunked batch inserts.
- **Status:** **Implemented**

---

## 5. Docker & Production Deployment

### ADR-13: Next.js Standalone Output & Multi-Stage Production Images

- **Context:** The initial production Docker images were bloated (Frontend: 1.25 GB, Backend: 826 MB; Combined: 2.065 GB), driven by devDependencies, corepack/pnpm tooling, and unpruned workspace modules.
- **Decision:**
  1. Configure `output: 'standalone'` in `apps/web/next.config.ts`.
  2. Implement multi-stage Dockerfiles utilizing clean `FROM node:22-slim AS runner` stages without pnpm or corepack installed.
  3. In `apps/web/Dockerfile`: Copy only `.next/standalone`, `public/`, and `.next/static`. Start via `node apps/web/server.js`.
  4. In `apps/api/Dockerfile`: Prune production dependencies via `pnpm install --frozen-lockfile --prod --filter api...` (234 packages instead of 627). Copy only compiled `dist/`, `package.json`, and `db/`. Start via `entrypoint.sh`.
- **Rationale:** Reduces frontend image to ~250–300 MB and backend image to ~200–250 MB (an aggregate ~75% reduction), improving deployment speed and container security.
- **Consequences:** Standalone builds require Next.js static assets (`.next/static` and `public`) to be copied explicitly into the runner stage.
- **Status:** **Implemented**

### ADR-14: Automated Database Initialization & Migration Ordering in Docker Compose

- **Context:** Evaluators and operators need a one-command startup experience (`docker compose up --build`) without manual database setup.
- **Decision:**
  1. `finpilot-postgres` defines a container healthcheck using `pg_isready`.
  2. `finpilot-api` uses `depends_on: postgres: condition: service_healthy`.
  3. The API entrypoint script (`apps/api/entrypoint.sh`) executes `node dist/database/migrate.js` followed by `node dist/database/seed.js` before executing `node dist/main.js`.
- **Rationale:** Guarantees that the relational schema exists and is populated with seed data before the HTTP server accepts traffic.
- **Consequences:** API container startup includes migration and seed time (~5 seconds) on cold boot.
- **Status:** **Implemented**

---

## 6. Formally Rejected Decisions

### REJ-01: Rejected — `transaction_quarantine` Table

- **Initial Proposal:** Split transaction data by storing invalid or future-dated rows in a separate `transaction_quarantine` table.
- **Final Status:** **REJECTED**
- **Reason:**
  1. The assignment's accepted database design and requirements mandate a unified relational model without fractured ledgers.
  2. A separate quarantine table causes schema drift, requires redundant migration maintenance, and complicates queries that need to inspect pending trades.
  3. In-ledger flagging (`is_future = true`) combined with line-by-line audit rows in `import_rows` cleanly fulfills all data quality requirements.
- **Implementation Status:** Not implemented. The table does not exist in any migration or schema file.
- **Final Outcome:** Unified `transactions` table with audit provenance in `import_rows`.

### REJ-02: Rejected — Storing JWT Tokens in `localStorage` or `sessionStorage`

- **Initial Proposal:** Store JWT tokens in browser Web Storage (`localStorage`) and inject them via client-side Axios / fetch interceptors.
- **Final Status:** **REJECTED**
- **Reason:** Any client-accessible token storage is vulnerable to cross-site scripting (XSS) exfiltration. Storing the token in an `httpOnly`, `SameSite=Lax` cookie ensures client JavaScript cannot access the credentials.
- **Implementation Status:** Not implemented.
- **Final Outcome:** Tokens are managed server-side by the Next.js API proxy.

### REJ-03: Rejected — Direct Client-to-API Communication with Auth Cookies

- **Initial Proposal:** Allow the browser to make cross-origin requests directly to the API on port 3001 with `credentials: include`.
- **Final Status:** **REJECTED**
- **Reason:** Cookies shared across `localhost` ports caused Swagger UI to authenticate with stale browser cookies, breaking the Swagger Authorize modal and coupling the REST API to browser cookie mechanics.
- **Implementation Status:** Not implemented.
- **Final Outcome:** Next.js server proxy forwards requests with `Authorization: Bearer <jwt>`. The API accepts Bearer tokens only.

### REJ-04: Rejected — Standalone Recharts without UI Wrapper

- **Initial Proposal:** Render raw Recharts components directly in JSX.
- **Final Status:** **REJECTED**
- **Reason:** Lacked integration with Tailwind CSS design tokens and dark mode CSS variables.
- **Implementation Status:** Not implemented.
- **Final Outcome:** shadcn/ui `ChartContainer` composition wrapper standard.

---

## 7. Deliberately Deferred Scope (Future Roadmap)

The following capabilities were intentionally excluded from this internal operations MVP per assignment guidelines:

- **Real-Time Price Feeds:** Static snapshot prices (`price_as_of`) were specified for all synthetic valuations.
- **Multi-Currency FX Engine:** All portfolios and transactions are denominated and settled in INR (`₹`).
- **External Notifications (Email/SMS):** In-app toasts and audit logs provide sufficient operations feedback.
- **Public Cloud Infrastructure:** Containerized local hosting with Docker Compose was specified.
- **Payment & Order Execution:** Platform is strictly read-heavy with goals maintenance and CSV ingestion.
