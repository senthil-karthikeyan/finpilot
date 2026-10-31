-- 03_monthly_net_flows.sql
-- Reviewer SQL: Monthly BUY/SELL net cash flow for the trailing 12 months across all customers.
-- Queries v_monthly_net_flows view (which strictly excludes future-dated transactions via AND NOT t.is_future).

SELECT
  TO_CHAR(month, 'YYYY-MM')   AS month_label,
  COUNT(DISTINCT customer_id) AS active_transacting_customers,
  ROUND(SUM(buy_total), 2)    AS total_buy_volume,
  ROUND(SUM(sell_total), 2)   AS total_sell_volume,
  ROUND(SUM(net_flow), 2)     AS net_cash_flow
FROM v_monthly_net_flows
GROUP BY month
ORDER BY month ASC;

