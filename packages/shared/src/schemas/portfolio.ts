import { z } from 'zod';
import { ASSET_CLASSES, ACCOUNT_STATUSES } from '../constants/index.js';

// ── Portfolio position (one row from v_portfolio_positions) ──────────────────

export const PortfolioPositionSchema = z.object({
  instrumentId: z.string(),
  symbol: z.string(),
  instrumentName: z.string(),
  assetClass: z.enum(ASSET_CLASSES),
  sector: z.string().nullable(),
  riskBand: z.string(),
  quantity: z.number(),
  avgCostPrice: z.number(), // INR, acquisition cost
  currentPrice: z.number(), // INR, latest synthetic price
  marketValue: z.number(), // quantity × currentPrice
  costBasis: z.number(), // quantity × avgCostPrice
  unrealisedPnl: z.number(), // marketValue − costBasis
  unrealisedPnlPct: z.number().nullable(), // % unrealised gain/loss
  weightPct: z.number(), // position % of customer total portfolio AUM
  priceDate: z.string(), // ISO date of latest price
  snapshotDate: z.string(), // ISO date of holdings snapshot
});
export type PortfolioPosition = z.infer<typeof PortfolioPositionSchema>;

// ── Account summary within the portfolio response ────────────────────────────

export const AccountPortfolioSchema = z.object({
  accountId: z.string(),
  accountType: z.string(),
  provider: z.string(),
  status: z.enum(ACCOUNT_STATUSES),
  openedAt: z.string(), // ISO date
  baseCurrency: z.string(),
  totalMarketValue: z.number(),
  totalCostBasis: z.number(),
  totalUnrealisedPnl: z.number(),
  totalUnrealisedPnlPct: z.number().nullable(),
  positions: z.array(PortfolioPositionSchema),
});
export type AccountPortfolio = z.infer<typeof AccountPortfolioSchema>;

// ── Asset-class allocation bucket ────────────────────────────────────────────

export const AllocationBucketSchema = z.object({
  assetClass: z.enum(ASSET_CLASSES),
  marketValue: z.number(),
  weightPct: z.number(),
  positionCount: z.number().int(),
});
export type AllocationBucket = z.infer<typeof AllocationBucketSchema>;

// ── Monthly cash-flow data point ─────────────────────────────────────────────

export const CashFlowMonthSchema = z.object({
  month: z.string(), // "YYYY-MM"
  buyAmount: z.number(), // total settled BUY amount (positive)
  sellAmount: z.number(), // total settled SELL amount (positive)
  netFlow: z.number(), // sellAmount − buyAmount
});
export type CashFlowMonth = z.infer<typeof CashFlowMonthSchema>;

export const CashFlowResponseSchema = z.object({
  customerId: z.string(),
  months: z.array(CashFlowMonthSchema),
});
export type CashFlowResponse = z.infer<typeof CashFlowResponseSchema>;

// ── Full portfolio response (GET /customers/:id/portfolio) ───────────────────

export const PortfolioResponseSchema = z.object({
  customerId: z.string(),
  totalAum: z.number(),
  totalCostBasis: z.number(),
  totalUnrealisedPnl: z.number(),
  totalUnrealisedPnlPct: z.number().nullable(),
  snapshotDate: z.string().nullable(),
  priceDate: z.string().nullable(),
  accounts: z.array(AccountPortfolioSchema),
  allocation: z.array(AllocationBucketSchema),
  monthlyCashFlow: z.array(CashFlowMonthSchema),
});
export type PortfolioResponse = z.infer<typeof PortfolioResponseSchema>;
