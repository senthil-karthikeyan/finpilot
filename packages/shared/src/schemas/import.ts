import { z } from 'zod';
import { IMPORT_OUTCOMES } from '../constants';

// ── Per-row result (returned in import response and stored in import_rows) ────

export const ImportRowResultSchema = z.object({
  rowNumber: z.number().int(),      // 1-based row number in the CSV
  transactionId: z.string(),        // value from the `id` column (may be empty)
  outcome: z.enum(IMPORT_OUTCOMES),
  reason: z.string().nullable(),    // human-readable rejection reason, null if imported
});
export type ImportRowResult = z.infer<typeof ImportRowResultSchema>;

// ── Full import response (POST /admin/imports/transactions) ──────────────────

export const ImportResponseSchema = z.object({
  batchId: z.string().uuid(),
  fileName: z.string(),
  totalRows: z.number().int(),       // total data rows parsed (excludes header)
  imported: z.number().int(),        // rows successfully written to transactions
  futureDated: z.number().int(),     // subset of imported: rows with is_future = true
  duplicate: z.number().int(),       // rows skipped because transaction_id already exists
  rejected: z.number().int(),        // rows that failed validation
  rows: z.array(ImportRowResultSchema),  // full per-row breakdown
});
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

// ── Import history item (GET /admin/imports) ─────────────────────────────────

export const ImportBatchSchema = z.object({
  batchId: z.string().uuid(),
  fileName: z.string(),
  importedBy: z.string(),            // user email
  importedAt: z.string(),            // ISO timestamp
  totalRows: z.number().int(),
  imported: z.number().int(),
  futureDated: z.number().int(),
  duplicate: z.number().int(),
  rejected: z.number().int(),
});
export type ImportBatch = z.infer<typeof ImportBatchSchema>;

// ── Data-quality summary (GET /admin/data-quality) ───────────────────────────

export const DataQualityItemSchema = z.object({
  anomaly: z.string(),               // short name, e.g. "before_open_date"
  count: z.number().int(),
  description: z.string(),           // human-readable explanation
  handling: z.string(),              // what the system does with these rows
});
export type DataQualityItem = z.infer<typeof DataQualityItemSchema>;

export const DataQualityResponseSchema = z.object({
  items: z.array(DataQualityItemSchema),
  generatedAt: z.string(),           // ISO timestamp
});
export type DataQualityResponse = z.infer<typeof DataQualityResponseSchema>;

