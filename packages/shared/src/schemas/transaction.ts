import { z } from 'zod';
import { TRANSACTION_TYPES, TRANSACTION_STATUSES } from '../constants/index.js';
import { PaginationMetaSchema } from '../types/api.js';

// ── Single transaction (used in list and detail responses) ───────────────────

export const TransactionSchema = z.object({
  id: z.string(), // e.g. "T0000001"
  transactionId: z.string(), // e.g. "T0000001"
  accountId: z.string(),
  accountType: z.string().nullable().optional(),
  instrumentId: z.string().nullable(),
  instrumentName: z.string().nullable().optional(),
  symbol: z.string().nullable().optional(),
  assetClass: z.string().nullable().optional(),
  type: z.enum(TRANSACTION_TYPES),
  transactionType: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  quantity: z.number(),
  price: z.number(), // INR per unit
  amount: z.number(),
  fee: z.number().optional(), // optional brokerage/platform fee in INR
  tradeDate: z.string(), // ISO date YYYY-MM-DD
  settlementDate: z.string().nullable().optional(),
  // Data-quality flags set during import or seed
  isFuture: z.boolean(), // trade_date is in the future
  beforeOpenFlag: z.boolean(), // trade_date < account open_date
  onClosedFlag: z.boolean(), // account was CLOSED at trade_date
});
export type Transaction = z.infer<typeof TransactionSchema>;

// ── Query params for GET /customers/:id/transactions ─────────────────────────

export const TransactionQuerySchema = z.object({
  accountId: z.string().optional(),
  instrumentId: z.string().optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  isFuture: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(),
  dateFrom: z.string().optional(), // alias for startDate
  dateTo: z.string().optional(), // alias for endDate
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['tradeDate', 'amount', 'transactionType', 'type']).default('tradeDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

// ── Paginated response wrapper for transactions ──────────────────────────────

export const PaginatedTransactionsResponseSchema = z.object({
  data: z.array(TransactionSchema),
  meta: PaginationMetaSchema,
  pagination: PaginationMetaSchema.optional(),
});
export type PaginatedTransactionsResponse = z.infer<typeof PaginatedTransactionsResponseSchema>;
