# FinPilot Database Seed & Anomaly Reconciliation

This directory documents the synthetic datasets, the deliberate data-quality anomalies identified in the assessment datasets, and how the FinPilot seeding and import engine reconciles them.

## Synthetic Datasets (`db/seed/data/`)

| File                    | Rows | Description                                                           |
| ----------------------- | ---- | --------------------------------------------------------------------- |
| `customers.csv`         | 120  | Master customer records (KYC status, segment, contact details)        |
| `instruments.csv`       | 80   | Fictional security master (symbol, asset class, exchange, price)      |
| `accounts.csv`          | 167  | Customer investment accounts (brokerage, mutual fund, retirement)     |
| `risk_profiles.csv`     | 120  | Latest customer risk profile (risk score 0–100, horizon, liquidity)   |
| `goals.csv`             | 177  | Financial goals (target amount, funded amount, priority, target date) |
| `holdings_snapshot.csv` | 985  | End-of-day positions snapshot (contains duplicate edge cases)         |
| `transactions.csv`      | 4554 | Transaction ledger (contains deliberate validation edge cases)        |
| `data_dictionary.csv`   | 55   | Column definitions and types                                          |

---

## Deliberate Data-Quality Anomalies & Reconciliation Strategy

### 1. Duplicate Position Snapshots (`holdings_snapshot.csv`)

- **Location:** Lines 984, 985, 986 are duplicate records for accounts `A00147`, `A00145`, `A00146`.
- **Primary Key:** `(account_id, instrument_id, snapshot_date)`
- **Handling:** Deduplicated in memory before bulk insertion and upserted with `onConflictDoNothing()`. Exactly **982** unique position records are stored, preventing primary key violations while logging the 3 duplicate rows.

### 2. Duplicate Transaction ID (`transactions.csv`)

- **Location:** Line 4552 has `transaction_id = 'T0000026'`, identical to line 27.
- **Handling:** Flagged during validation. Recorded in `import_rows` with outcome `duplicate` and error code `DUPLICATE_TRANSACTION_ID`. Not inserted into `transactions` to protect primary key integrity. Increments `duplicate_count` on `import_batches`.

### 3. Invalid Instrument Foreign Key (`transactions.csv`)

- **Location:** Line 4553 has `transaction_id = 'T0004551'` referencing `instrument_id = 'I9999'` (not present in security master).
- **Handling:** Foreign key check fails. Recorded in `import_rows` with outcome `rejected` and error code `INVALID_INSTRUMENT_FK`. Not inserted into `transactions` to prevent orphan records. Increments `rejected_count` on `import_batches`.

### 4. Inverted Negative Fee Sign (`transactions.csv`)

- **Location:** Line 4554 has `transaction_id = 'T0004552'` with `amount = -75` and `transaction_type = 'FEE'`.
- **Handling:** All other 391 FEE transactions in the ledger have positive amounts representing debit fees. In accordance with explicit domain normalization rules, normalized to positive `75.00` (`Math.abs(amount)`). Inserted into `transactions` and logged in `import_rows` with audit details.

### 5. Future-Dated Pending Transaction (`transactions.csv`)

- **Location:** Line 4555 has `transaction_id = 'T0004553'`, status `PENDING`, and `trade_date = '2027-01-05'` (in the future relative to the dataset snapshot date `2026-09-18`).
- **Handling:** Preserved in the main `transactions` table with `is_future = true`. Increments `future_dated_count` on `import_batches`. Automatically excluded from cash-flow aggregation and monthly net flow totals via `v_monthly_net_flows` view (`WHERE NOT t.is_future`). Visible in UI transaction tables with a badge. No separate quarantine table is used.

### 6. Pre-Account Opening Transactions

- **Location:** 116 transactions where `trade_date < account.opened_at`.
- **Handling:** Preserved in the ledger with audit flag `before_open_flag = true` for reconciliation reporting.

### 7. Transactions on Closed Accounts

- **Location:** Transactions executed on accounts where `status = 'CLOSED'` (`A00001`, `A00024`, etc.).
- **Handling:** Preserved in the ledger with audit flag `on_closed_flag = true` for compliance and audit logs.

### 8. Demo Users Seeding

- **Users:**
  - `viewer@finpilot.test` (`Viewer#2026`, role: `VIEWER`)
  - `admin@finpilot.test` (`Admin#2026`, role: `ADMIN`)
- **Handling:** Passwords hashed with salted `bcrypt` (cost factor 10) and upserted on email.

---

## Running the Seed

```bash
# From the project root:
pnpm db:seed

# Or via package filter:
pnpm --filter api db:seed
```
