# @finpilot/api — FinPilot Backend REST API


The backend application for FinPilot is a modular REST API built with NestJS 12, TypeScript, Drizzle ORM, and PostgreSQL 16.

---


## 1. Responsibilities


- **Authentication & RBAC:** User login via bcrypt password hashing, stateless JWT issuance (8-hour expiry), global Passport JWT guard with `@Public()` decorator, and role-based access control (`@Roles(UserRole.ADMIN)`). Pure Bearer authentication (`Authorization: Bearer <jwt>`).
- **Customer Profiles & Search:** Paginated customer directory with search across name, email, city, and ID; KYC and wealth segment filters; full customer profiles with latest risk score.
- **Portfolio Valuation:** Portfolio market value, cost basis, unrealised gain/loss, asset-class breakdown (Equity, ETF, Mutual Fund, Bond, REIT, G-Sec), and trailing 12-month net cash flow calculation.
- **Transactions Management:** Paginated transaction history with server-side filters (account, instrument, transaction type, date range) and visual anomaly classifications.
- **Goals Tracking:** Financial goals CRUD operations, funded percentage calculation, and non-retroactive target date validation.
- **Operations CSV Ingestion:** Administrator endpoint (`POST /admin/imports/transactions`) providing 4-stage CSV validation, duplicate detection, invalid FK rejection, future-dated tagging, and line-by-line audit recording (`import_rows`).
- **Data Quality Audits:** Ledger-wide audit reports (`GET /admin/data-quality`) tracking verified data anomalies.
- **API Documentation & Health:** OpenAPI / Swagger 3.0 UI at `/api/docs` and liveness/readiness health check at `/health`.


---


## 2. Directory Structure

```text
apps/api/
├── Dockerfile                  # Multi-stage production container build (pruned runner)
├── entrypoint.sh               # Container startup script (migrate -> seed -> start)
├── src/
│   ├── admin/                  # CSV ingestion service and data-quality controller
│   ├── auth/                   # Passport JWT strategy, bcrypt hashing, and guards
│   ├── customers/              # Customer directory and search endpoints
│   ├── database/               # Drizzle connection, migrations, and seed logic
│   │   ├── schema/             # Declarative Drizzle table definitions
│   │   ├── anomaly-rules.ts    # Anomaly reconciliation rules & reference dates
│   │   ├── migrate.ts          # Migration runner
│   │   └── seed.ts             # CSV data loader and demo user seeder
│   ├── goals/                  # Goals CRUD endpoints and validation
│   ├── portfolio/              # Valuation and cash flow aggregation endpoints
│   ├── transactions/           # Paginated transactions endpoints
│   ├── app.controller.ts       # Health endpoint (/health)
│   ├── app.module.ts           # Root NestJS module wiring
│   └── main.ts                 # Bootstrap, CORS, Swagger, and ValidationPipe
└── test/                       # Service tests and controller test suites (Vitest)
````


---

## 3. Available Scripts

From the repository root or inside `apps/api`:

```bash

# Run API in development watch mode

pnpm --filter @finpilot/api dev


# Run unit and service test suites (71 tests)

pnpm --filter @finpilot/api test


# Type-check TypeScript sources

pnpm --filter @finpilot/api type-check


# Run oxlint linter

pnpm --filter @finpilot/api lint


# Build production distribution (dist/)

pnpm --filter @finpilot/api build


# Run database migrations manually

pnpm --filter @finpilot/api db:migrate

# Seed synthetic CSV datasets and demo users manually
pnpm --filter @finpilot/api db:seed
```

---


## 4. API Endpoints Reference


All endpoints (except health and Swagger) are prefixed with `/api/v1`:


| Method   | Endpoint                             | Auth           | Description                                                           |
| -------- | ------------------------------------ | -------------- | --------------------------------------------------------------------- |
| `GET`    | `/health`                            | Public         | Application health and database readiness                             |
| `GET`    | `/api/docs`                          | Public         | Swagger OpenAPI 3.0 specification & interactive UI                    |
| `POST`   | `/api/v1/auth/login`                 | Public         | Validates credentials, returns JWT access token in JSON body          |
| `GET`    | `/api/v1/customers`                  | Bearer         | Paginated customer search with segment and KYC filtering              |
| `GET`    | `/api/v1/customers/:id`              | Bearer         | Customer profile and latest risk profile summary                      |
| `GET`    | `/api/v1/customers/:id/portfolio`    | Bearer         | Customer portfolio totals, asset allocation, and account balances     |
| `GET`    | `/api/v1/customers/:id/transactions` | Bearer         | Paginated, filtered transaction history                               |
| `GET`    | `/api/v1/customers/:id/goals`        | Bearer         | Customer financial goals with funded percentages                      |
| `POST`   | `/api/v1/customers/:id/goals`        | Bearer         | Create a validated financial goal                                     |
| `PATCH`  | `/api/v1/goals/:goalId`              | Bearer         | Update selected goal fields (target date validation)                  |
| `DELETE` | `/api/v1/goals/:goalId`              | Bearer         | Delete a financial goal                                               |
| `POST`   | `/api/v1/admin/imports/transactions` | Bearer (ADMIN) | Upload & validate transaction CSV, commit valid rows, audit anomalies |
| `GET`    | `/api/v1/admin/imports`              | Bearer (ADMIN) | List previous CSV import batches                                      |
| `GET`    | `/api/v1/admin/imports/:batchId`     | Bearer (ADMIN) | Detailed row outcomes and error report for an import batch            |
| `GET`    | `/api/v1/admin/data-quality`         | Bearer (ADMIN) | Ledger-wide summary counts for all verified data anomalies            |
