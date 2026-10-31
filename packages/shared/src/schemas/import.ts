import { z } from 'zod';
import { IMPORT_OUTCOMES } from '../constants/index.js';

// ── Per-row result (returned in import response and stored in import_rows) ────

export const ImportRowResultSchema = z.object({
  rowNumber: z.number().int(), // 1-based row number in the CSV
  lineNumber: z.number().int().optional(), // alias for rowNumber
  transactionId: z.string().nullable().optional(), // value from transaction_id column
  outcome: z.enum(IMPORT_OUTCOMES),
  reason: z.string().nullable().optional(), // human-readable rejection reason
  errorMessage: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
});
export type ImportRowResult = z.infer<typeof ImportRowResultSchema>;

// ── Full import response (POST /admin/imports/transactions) ──────────────────

export const ImportResponseSchema = z.object({
  batchId: z.string(),
  fileName: z.string(),
  totalRows: z.number().int(), // total data rows parsed (excludes header)
  imported: z.number().int(), // rows successfully written to transactions
  futureDated: z.number().int(), // subset of imported: rows with is_future = true
  duplicate: z.number().int(), // rows skipped because transaction_id already exists
  rejected: z.number().int(), // rows that failed validation
  durationMs: z.number().int().optional(),
  status: z.string().optional(),
  rows: z.array(ImportRowResultSchema), // full per-row breakdown
});
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

// ── Import history item (GET /admin/imports) ─────────────────────────────────

export const ImportBatchSchema = z.object({
  batchId: z.string(),
  fileName: z.string(),
  importedBy: z.string(), // user email
  importedAt: z.string(), // ISO timestamp
  totalRows: z.number().int(),
  imported: z.number().int(),
  futureDated: z.number().int(),
  duplicate: z.number().int(),
  rejected: z.number().int(),
  durationMs: z.number().int().nullable().optional(),
  status: z.string(),
});
export type ImportBatch = z.infer<typeof ImportBatchSchema>;

// ── Data-quality summary (GET /admin/data-quality) ───────────────────────────

export const DataQualityItemSchema = z.object({
  anomaly: z.string(), // short name, e.g. "before_open_date"
  count: z.number().int(),
  description: z.string(), // human-readable explanation
  handling: z.string(), // what the system does with these rows
});
export type DataQualityItem = z.infer<typeof DataQualityItemSchema>;

export const DataQualityResponseSchema = z.object({
  items: z.array(DataQualityItemSchema),
  generatedAt: z.string(), // ISO timestamp
});
export type DataQualityResponse = z.infer<typeof DataQualityResponseSchema>;

// ── Paginated rejected import rows (GET /admin/imports/:batchId/rejected) ────

export const PaginatedRejectedRowsResponseSchema = z.object({
  data: z.array(ImportRowResultSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type PaginatedRejectedRowsResponse = z.infer<typeof PaginatedRejectedRowsResponseSchema>;
