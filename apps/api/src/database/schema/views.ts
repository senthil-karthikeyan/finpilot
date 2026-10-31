import { pgView, text, numeric, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * v_portfolio_positions
 *
 * Pre-aggregates holdings with current instrument prices and account metadata.
 * Market value and unrealised P&L are computed strictly in SQL (never in JS).
 */
export const vPortfolioPositions = pgView('v_portfolio_positions', {
  accountId: text('account_id'),
  customerId: text('customer_id'),
  accountType: text('account_type'),
  provider: text('provider'),
  accountStatus: text('account_status'),
  baseCurrency: text('base_currency'),
  instrumentId: text('instrument_id'),
  symbol: text('symbol'),
  instrumentName: text('instrument_name'),
  assetClass: text('asset_class'),
  sector: text('sector'),
  riskBand: text('risk_band'),
  lastPrice: numeric('last_price', { precision: 18, scale: 4 }),
  priceAsOf: date('price_as_of'),
  quantity: numeric('quantity', { precision: 18, scale: 6 }),
  avgCost: numeric('avg_cost', { precision: 18, scale: 4 }),
  snapshotDate: date('snapshot_date'),
  marketValue: numeric('market_value', { precision: 18, scale: 2 }),
  costBasis: numeric('cost_basis', { precision: 18, scale: 2 }),
  unrealisedPnl: numeric('unrealised_pnl', { precision: 18, scale: 2 }),
  unrealisedPnlPct: numeric('unrealised_pnl_pct', { precision: 18, scale: 2 }),
}).as(sql`
  SELECT
    h.account_id,
    a.customer_id,
    a.account_type,
    a.provider,
    a.status                                                          AS account_status,
    a.base_currency,
    h.instrument_id,
    i.symbol,
    i.instrument_name,
    i.asset_class,
    i.sector,
    i.risk_band,
    i.last_price,
    i.price_as_of,
    h.quantity,
    h.avg_cost,
    h.snapshot_date,
    ROUND(h.quantity * i.last_price,                           2)    AS market_value,
    ROUND(h.quantity * h.avg_cost,                             2)    AS cost_basis,
    ROUND(h.quantity * i.last_price - h.quantity * h.avg_cost, 2)    AS unrealised_pnl,
    CASE WHEN h.avg_cost > 0
      THEN ROUND((i.last_price - h.avg_cost) / h.avg_cost * 100, 2)
      ELSE NULL
    END                                                               AS unrealised_pnl_pct
  FROM holdings_snapshot h
  JOIN accounts    a ON a.account_id    = h.account_id
  JOIN instruments i ON i.instrument_id = h.instrument_id
`);

/**
 * v_monthly_net_flows
 *
 * Monthly BUY/SELL net cash flow per customer, settled, non-future, last 12 months.
 * Excludes future-dated transactions via `WHERE NOT is_future`.
 */
export const vMonthlyNetFlows = pgView('v_monthly_net_flows', {
  customerId: text('customer_id'),
  month: date('month'),
  buyTotal: numeric('buy_total', { precision: 18, scale: 2 }),
  sellTotal: numeric('sell_total', { precision: 18, scale: 2 }),
  netFlow: numeric('net_flow', { precision: 18, scale: 2 }),
}).as(sql`
  SELECT
    a.customer_id,
    DATE_TRUNC('month', t.trade_date)::DATE                         AS month,
    SUM(CASE WHEN t.transaction_type = 'BUY'  THEN t.amount ELSE 0 END)  AS buy_total,
    SUM(CASE WHEN t.transaction_type = 'SELL' THEN t.amount ELSE 0 END)  AS sell_total,
    SUM(CASE
          WHEN t.transaction_type = 'SELL' THEN  t.amount
          WHEN t.transaction_type = 'BUY'  THEN -t.amount
          ELSE 0
        END)                                                         AS net_flow
  FROM transactions t
  JOIN accounts a ON a.account_id = t.account_id
  WHERE t.status          = 'SETTLED'
    AND t.transaction_type IN ('BUY','SELL')
    AND NOT t.is_future
    AND t.trade_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  GROUP BY a.customer_id, DATE_TRUNC('month', t.trade_date)
`);

