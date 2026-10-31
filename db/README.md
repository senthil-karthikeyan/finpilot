# db/

This directory contains everything database-related that is **not** application code.

| Subdirectory  | Contents                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrations/` | Drizzle-generated SQL migration files, named `0000_*.sql` etc. Run in order on an empty database to build the full schema.                                                                                |
| `seed/`       | TypeScript seed script (`apps/api/src/database/seed.ts`), documentation, and raw synthetic CSV datasets (`data/`). Handles all verified data anomalies.                                                   |
| `queries/`    | Reviewer SQL queries covering the SQL tasks in the assignment (top customers by AUM, asset-class allocation, monthly net flows, etc.). Plain `.sql` files, runnable directly against the seeded database. |

## Running migrations

```bash
# From the project root
pnpm db:migrate

# Or via package filter
pnpm --filter api db:migrate
```

## Running the seed

```bash
# From the project root
pnpm db:seed

# Or via package filter
pnpm --filter api db:seed
```

## Running reviewer queries

```bash
psql $DATABASE_URL -f db/queries/01_top_customers_by_aum.sql
psql $DATABASE_URL -f db/queries/02_asset_class_allocation.sql
psql $DATABASE_URL -f db/queries/03_monthly_net_flows.sql
psql $DATABASE_URL -f db/queries/04_top_instruments.sql
psql $DATABASE_URL -f db/queries/05_underfunded_high_priority_goals.sql
psql $DATABASE_URL -f db/queries/06_data_quality_exceptions.sql
psql $DATABASE_URL -f db/queries/07_explain_analyze_plan.sql
```
