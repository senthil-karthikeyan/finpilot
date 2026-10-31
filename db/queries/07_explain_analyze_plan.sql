-- 07_explain_analyze_plan.sql
-- Reviewer SQL: Query execution plan demonstrating index usage and efficiency.

-- Plan A: Customer transaction history query using composite index idx_tx_account_date
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  transaction_id,
  account_id,
  instrument_id,
  transaction_type,
  trade_date,
  quantity,
  price,
  amount,
  status
FROM transactions
WHERE account_id = 'A00001'
ORDER BY trade_date DESC
LIMIT 20;

-- Plan B: GIN full-text customer search query using idx_customers_search
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  customer_id,
  full_name,
  email,
  city,
  kyc_status,
  segment
FROM customers
WHERE to_tsvector('simple', full_name || ' ' || email || ' ' || city || ' ' || customer_id)
  @@ to_tsquery('simple', 'Mumbai:*')
LIMIT 10;

