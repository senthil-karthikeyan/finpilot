-- 06_data_quality_exceptions.sql
-- Reviewer SQL: Data-quality, reconciliation exceptions, and anomaly detection.
-- Queries audit/anomaly flags, rejected rows, and ledger consistency.

-- Exception 1: Future-dated transactions (flagged with is_future = true)
SELECT
  transaction_id,
  account_id,
  trade_date,
  transaction_type,
  amount,
  status,
  is_future,
  'Future-dated trade date preserved in ledger but excluded from cash-flow aggregation' AS anomaly_reason
FROM transactions
WHERE is_future = true;

-- Exception 2: Transactions executed prior to account opening date
SELECT
  t.transaction_id,
  t.account_id,
  t.trade_date,
  a.opened_at AS account_opened_at,
  t.transaction_type,
  t.amount,
  'Trade date precedes account opening date' AS anomaly_reason
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id
WHERE t.before_open_flag = true
LIMIT 10;

-- Exception 3: Transactions executed on closed accounts
SELECT
  t.transaction_id,
  t.account_id,
  t.trade_date,
  a.status AS account_status,
  t.transaction_type,
  t.amount,
  'Transaction executed against an account marked CLOSED' AS anomaly_reason
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id
WHERE t.on_closed_flag = true
LIMIT 10;

-- Exception 4: Audit log of rejected/duplicate/future import rows
SELECT
  batch_id,
  line_number,
  transaction_id,
  outcome,
  error_code,
  error_message
FROM import_rows
WHERE outcome IN ('duplicate', 'rejected', 'future_dated')
ORDER BY line_number ASC;

