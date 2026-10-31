import { z } from 'zod';
import { TRANSACTION_TYPES, TRANSACTION_STATUSES } from '../constants/index.js';

// ── Single transaction (used in list and detail responses) ───────────────────

export const TransactionSchema = z.object({
  id: z.string(),               // e.g. "T0000001"
  accountId: z.string(),
  instrumentId: z.string(),
  instrumentName: z.string(),
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  quantity: z.number(),
  price: z.number(),            // INR per unit
  amount: z.number(),           // quantity × price
  fee: z.number(),              // brokerage/platform fee in INR
  tradeDate: z.string(),        // ISO date YYYY-MM-DD
  settlementDate: z.string().nullable(),
  // Data-quality flags set during import or seed
  isFuture: z.boolean(),        // trade_date is in the future
  beforeOpenFlag: z.boolean(),  // trade_date < account open_date
  onClosedFlag: z.boolean(),    // account was CLOSED at trade_date
});
export type Transaction = z.infer<typeof TransactionSchema>;

// ── Query params for GET /customers/:id/transactions ─────────────────────────

export const TransactionQuerySchema = z.object({
  accountId: z.string().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  isFuture: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['tradeDate', 'amount', 'type']).default('tradeDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

