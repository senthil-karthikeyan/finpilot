
# db/ — Database Migrations, Seeding & SQL Analysis Queries

This directory contains database artifacts, Drizzle migrations, synthetic CSV datasets, and standalone SQL analysis queries.


---


## 1. Directory Structure

| Subdirectory  | Contents                                                                                                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/` | Drizzle-generated versioned SQL migration files (`0000_slow_wraith.sql`). Creates 10 core tables, check constraints, GIN indexes, and analytical views (`v_portfolio_positions`, `v_monthly_net_flows`). |
| `seed/`       | Documentation and raw synthetic CSV datasets (`data/` or `docs/`) used to populate the database on initial boot.                                                                                         |
| `queries/`    | Reviewer SQL queries covering the SQL tasks in the assignment specification (top customers by AUM, asset allocation, monthly net cash flows, underfunded goals, etc.).                                   |

> [!NOTE]
> In Docker Compose, migrations and dataset seeding run **automatically** on container boot via `apps/api/entrypoint.sh` once PostgreSQL is healthy. Manual execution is only necessary when developing on bare-metal.

---

## 2. Running Migrations

```bash
# Run migrations from repository root
pnpm db:migrate

# Or via package filter
pnpm --filter api db:migrate
```

---

## 3. Running the Dataset Seed

```bash
# Run seed from repository root
pnpm db:seed

# Or via package filter
pnpm --filter api db:seed
```

### Seed Anomaly Handling Summary

The seed script (`apps/api/src/database/seed.ts` and `apps/api/src/database/anomaly-rules.ts`) handles known synthetic anomalies without modifying raw source files:

- **Duplicate Holdings:** Deduplicated on natural composite primary key `(account_id, instrument_id, snapshot_date)`.
- **Duplicate Transactions:** Skips second occurrence of `T0000026`.
- **Invalid Foreign Key:** Rejects transaction `T0004551` (`UNKNOWN_INSTRUMENT: I9999`) and records audit row in `import_rows`.
- **Negative Fee Amount:** Rejects transaction `T0004552` (`NEGATIVE_AMOUNT: -75.00`) and records audit row in `import_rows`.
- **Future-Dated Trades:** Ingests transaction `T0004553` (dated `2027-01-05`) into the unified `transactions` ledger with `is_future = true`.
- **Demo Users:** Automatically creates demo accounts (`viewer@finpilot.test` and `admin@finpilot.test`) with bcrypt password hashes.

> [!IMPORTANT]
> **Database Design Note: Rejected `transaction_quarantine` Table**
> A separate `transaction_quarantine` table was considered during initial design but was **rejected**. The production database maintains an immutable, unified `transactions` ledger with boolean anomaly flags (`is_future`, `before_open_flag`, `on_closed_flag`), while line-by-line rejected records are audited in `import_rows`.

---

## 4. Running Reviewer SQL Queries

Each query file can be run directly using `psql`:

```bash
# 1. Top 10 customers by current snapshot AUM
psql $DATABASE_URL -f db/queries/01_top_customers_by_aum.sql

# 2. Asset-class allocation across the entire dataset
psql $DATABASE_URL -f db/queries/02_asset_class_allocation.sql

# 3. Monthly BUY/SELL net cash flow for the trailing 12 months
psql $DATABASE_URL -f db/queries/03_monthly_net_flows.sql

# 4. Top instruments by number of distinct holders
psql $DATABASE_URL -f db/queries/04_top_instruments.sql

# 5. Customers with high-priority goals below 25% funded
psql $DATABASE_URL -f db/queries/05_underfunded_high_priority_goals.sql

# 6. Data-quality and reconciliation exceptions audit
psql $DATABASE_URL -f db/queries/06_data_quality_exceptions.sql

# 7. EXPLAIN (ANALYZE, BUFFERS) query plan explanation
psql $DATABASE_URL -f db/queries/07_explain_analyze_plan.sql
```
