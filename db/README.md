# db/

This directory contains everything database-related that is **not** application code.

| Subdirectory | Contents |
|---|---|
| `migrations/` | Drizzle-generated SQL migration files, named `0001_*.sql` etc. Run in order on an empty database to build the full schema. Added in the `feat/db-schema` branch. |
| `seed/` | TypeScript seed script that loads all 7 CSVs in dependency order and handles the verified data anomalies. Added in `feat/seed-and-anomalies`. |
| `queries/` | Reviewer SQL queries covering the SQL tasks in the assignment (top customers by AUM, asset-class allocation, monthly net flows, etc.). Plain `.sql` files, runnable directly against the seeded database. |

## Running migrations

```bash
# From the project root
pnpm --filter @finpilot/api drizzle:migrate
```

## Running the seed

```bash
pnpm --filter @finpilot/api drizzle:seed
```

## Running reviewer queries

```bash
psql $DATABASE_URL -f db/queries/01_top_customers_by_aum.sql
```

