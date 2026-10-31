import { z } from 'zod';
import { ASSET_CLASSES, ACCOUNT_STATUSES } from '../constants';

// ── Portfolio position (one row from v_portfolio_positions) ──────────────────

export const PortfolioPositionSchema = z.object({
  instrumentId: z.string(),
  instrumentName: z.string(),
  assetClass: z.enum(ASSET_CLASSES),
  quantity: z.number(),
  avgCostPrice: z.number(),   // INR, from transactions
  currentPrice: z.number(),   // INR, latest price in instruments table
  marketValue: z.number(),    // quantity × currentPrice, computed in SQL
  unrealisedPnl: z.number(),  // marketValue − (quantity × avgCostPrice)
  weightPct: z.number(),      // position as % of total account market value
  priceDate: z.string(),      // ISO date of the price used (from snapshot)
});
export type PortfolioPosition = z.infer<typeof PortfolioPositionSchema>;

// ── Account summary within the portfolio response ────────────────────────────

export const AccountPortfolioSchema = z.object({
  accountId: z.string(),
  accountType: z.string(),
  status: z.enum(ACCOUNT_STATUSES),
  openedAt: z.string(),       // ISO date
  closedAt: z.string().nullable(),
  totalMarketValue: z.number(),
  totalUnrealisedPnl: z.number(),
  positions: z.array(PortfolioPositionSchema),
});
export type AccountPortfolio = z.infer<typeof AccountPortfolioSchema>;

// ── Asset-class allocation bucket ────────────────────────────────────────────

export const AllocationBucketSchema = z.object({
  assetClass: z.enum(ASSET_CLASSES),
  marketValue: z.number(),
  weightPct: z.number(),
});
export type AllocationBucket = z.infer<typeof AllocationBucketSchema>;

// ── Full portfolio response (GET /customers/:id/portfolio) ───────────────────

export const PortfolioResponseSchema = z.object({
  customerId: z.string(),
  totalAum: z.number(),
  totalUnrealisedPnl: z.number(),
  snapshotDate: z.string().nullable(), // date of the holdings snapshot used
  accounts: z.array(AccountPortfolioSchema),
  allocation: z.array(AllocationBucketSchema),
});
export type PortfolioResponse = z.infer<typeof PortfolioResponseSchema>;

// ── Monthly cash-flow data point (GET /customers/:id/cashflow) ───────────────

export const CashFlowMonthSchema = z.object({
  month: z.string(),      // "YYYY-MM" label for the X-axis
  buyAmount: z.number(),  // total BUY value (positive)
  sellAmount: z.number(), // total SELL value (positive)
  netFlow: z.number(),    // sellAmount − buyAmount (positive = net inflow)
});
export type CashFlowMonth = z.infer<typeof CashFlowMonthSchema>;

export const CashFlowResponseSchema = z.object({
  customerId: z.string(),
  months: z.array(CashFlowMonthSchema),
});
export type CashFlowResponse = z.infer<typeof CashFlowResponseSchema>;

