-- 05_underfunded_high_priority_goals.sql
-- Reviewer SQL: Customers with high-priority financial goals that are funded under 25%.

SELECT
  c.customer_id,
  c.full_name,
  c.email,
  c.segment,
  g.goal_id,
  g.goal_type,
  g.goal_name,
  g.priority,
  g.target_amount,
  g.current_funded_amount,
  ROUND((g.current_funded_amount / g.target_amount * 100), 2) AS funded_percentage,
  g.target_date,
  CASE
    WHEN g.target_date < CURRENT_DATE THEN 'OVERDUE'
    ELSE 'ACTIVE'
  END AS schedule_status
FROM goals g
JOIN customers c ON c.customer_id = g.customer_id
WHERE g.priority = 'HIGH'
  AND (g.current_funded_amount / g.target_amount) < 0.25
ORDER BY funded_percentage ASC, g.target_amount DESC;

