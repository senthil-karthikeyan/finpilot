import type { AssetClass, GoalType, TransactionType } from '@finpilot/shared';

export const ASSET_META: Record<AssetClass, { label: string; color: string }> = {
  EQUITY: { label: 'Equity', color: '#24337a' },
  ETF: { label: 'ETF', color: '#5b86c4' },
  MUTUAL_FUND: { label: 'Mutual fund', color: '#2f8f83' },
  BOND: { label: 'Bond', color: '#7a5c8e' },
  REIT: { label: 'REIT', color: '#b86b2d' },
  GSEC: { label: 'Government securities', color: '#8a9a4b' },
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BROKERAGE: 'Brokerage',
  MUTUAL_FUND: 'Mutual fund',
  RETIREMENT: 'Retirement',
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  EMERGENCY_FUND: 'Emergency fund',
  EDUCATION: 'Education',
  RETIREMENT: 'Retirement',
  TRAVEL: 'Travel',
  WEALTH_CREATION: 'Wealth creation',
  HOME_PURCHASE: 'Home purchase',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  DIVIDEND: 'Dividend',
  FEE: 'Fee',
};

