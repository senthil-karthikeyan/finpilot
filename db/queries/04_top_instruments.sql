-- 04_top_instruments.sql
-- Reviewer SQL: Top instruments ranked by the number of distinct customer holders.

SELECT
  i.instrument_id,
  i.symbol,
  i.instrument_name,
  i.asset_class,
  i.last_price,
  COUNT(DISTINCT p.customer_id) AS distinct_holders_count,
  ROUND(SUM(p.quantity), 4)     AS total_units_held,
  ROUND(SUM(p.market_value), 2) AS aggregate_market_value
FROM instruments i
JOIN v_portfolio_positions p ON p.instrument_id = i.instrument_id
GROUP BY
  i.instrument_id,
  i.symbol,
  i.instrument_name,
  i.asset_class,
  i.last_price
ORDER BY distinct_holders_count DESC, aggregate_market_value DESC
LIMIT 15;

