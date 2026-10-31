// Application-wide constants shared between backend and frontend.

/** User roles. Must match the database `users.role` enum. */
export const USER_ROLES = ['VIEWER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Asset-class values that appear in instruments.csv and the portfolio view. */
export const ASSET_CLASSES = [
  'EQUITY',
  'ETF',
  'MUTUAL_FUND',
  'BOND',
  'REIT',
  'GSEC',
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

/** Transaction types. */
export const TRANSACTION_TYPES = ['BUY', 'SELL'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Transaction statuses. */
export const TRANSACTION_STATUSES = ['SETTLED', 'PENDING', 'REVERSED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Goal types. */
export const GOAL_TYPES = [
  'RETIREMENT',
  'EDUCATION',
  'HOUSE',
  'EMERGENCY',
  'WEALTH',
  'OTHER',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

/** Goal priority levels. */
export const GOAL_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

/** Account statuses. */
export const ACCOUNT_STATUSES = ['ACTIVE', 'CLOSED', 'DORMANT'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Import row outcomes. */
export const IMPORT_OUTCOMES = ['imported', 'duplicate', 'rejected', 'future_dated'] as const;
export type ImportOutcome = (typeof IMPORT_OUTCOMES)[number];

/** KYC statuses. */
export const KYC_STATUSES = ['VERIFIED', 'PENDING', 'EXPIRED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

/** Customer segments. */
export const CUSTOMER_SEGMENTS = ['RETAIL', 'HNI', 'UHNI', 'INSTITUTIONAL'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

/** Risk categories. */
export const RISK_CATEGORIES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

/** Pagination defaults. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Maximum CSV import file size (10 MB). */
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

/** Authentication cookie name. */
export const AUTH_COOKIE_NAME = 'finpilot_token';

/** Authentication JWT expiration in seconds (8 hours). */
export const JWT_EXPIRY_SECONDS = 28_800;
