-- 01_top_customers_by_aum.sql
-- Reviewer SQL: Top 10 customers by current snapshot AUM (Assets Under Management)
-- Uses v_portfolio_positions view to calculate aggregated portfolio value per customer.

SELECT
  c.customer_id,
  c.full_name,
  c.email,
  c.segment,
  c.kyc_status,
  COUNT(DISTINCT p.account_id) AS active_accounts,
  COUNT(p.instrument_id)       AS total_positions,
  ROUND(COALESCE(SUM(p.market_value), 0), 2) AS total_aum_inr
FROM customers c
LEFT JOIN v_portfolio_positions p ON p.customer_id = c.customer_id
GROUP BY
  c.customer_id,
  c.full_name,
  c.email,
  c.segment,
  c.kyc_status
ORDER BY total_aum_inr DESC
LIMIT 10;

