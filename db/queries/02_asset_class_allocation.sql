-- 02_asset_class_allocation.sql
-- Reviewer SQL: Asset-class allocation across the entire dataset and for a single customer.

-- Part A: Entire Dataset Asset-Class Allocation
WITH total_portfolio AS (
  SELECT SUM(market_value) AS grand_total_market_value
  FROM v_portfolio_positions
)
SELECT
  p.asset_class,
  COUNT(DISTINCT p.customer_id)                                           AS distinct_investors,
  COUNT(*)                                                                AS position_count,
  ROUND(SUM(p.market_value), 2)                                           AS total_market_value,
  ROUND((SUM(p.market_value) / MAX(t.grand_total_market_value) * 100), 2) AS allocation_pct
FROM v_portfolio_positions p
CROSS JOIN total_portfolio t
GROUP BY p.asset_class
ORDER BY total_market_value DESC;

-- Part B: Single Customer Asset-Class Allocation (Example: 'C0001')
WITH customer_total AS (
  SELECT SUM(market_value) AS customer_total_market_value
  FROM v_portfolio_positions
  WHERE customer_id = 'C0001'
)
SELECT
  p.asset_class,
  COUNT(*)                                                                    AS position_count,
  ROUND(SUM(p.market_value), 2)                                               AS customer_market_value,
  ROUND((SUM(p.market_value) / MAX(ct.customer_total_market_value) * 100), 2) AS customer_allocation_pct
FROM v_portfolio_positions p
CROSS JOIN customer_total ct
WHERE p.customer_id = 'C0001'
GROUP BY p.asset_class
ORDER BY customer_market_value DESC;

