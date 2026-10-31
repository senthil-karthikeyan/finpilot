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
  filename: z.string().optional(),
  totalRows: z.number().int(), // total data rows parsed (excludes header)
  rowCount: z.number().int().optional(),
  imported: z.number().int(), // rows successfully written to transactions
  importedCount: z.number().int().optional(),
  futureDated: z.number().int(), // subset of imported: rows with is_future = true
  futureDatedCount: z.number().int().optional(),
  duplicate: z.number().int(), // rows skipped because transaction_id already exists
  duplicateCount: z.number().int().optional(),
  rejected: z.number().int(), // rows that failed validation
  rejectedCount: z.number().int().optional(),
  durationMs: z.number().int().optional(),
  status: z.string().optional(),
  rows: z.array(ImportRowResultSchema), // full per-row breakdown
});
export type ImportResponse = z.infer<typeof ImportResponseSchema>;

// ── Import history item (GET /admin/imports) ─────────────────────────────────

export const ImportBatchSchema = z.object({
  batchId: z.string(),
  fileName: z.string(),
  filename: z.string().optional(),
  importedBy: z.string(), // user email
  importedAt: z.string(), // ISO timestamp
  receivedAt: z.string().optional(),
  totalRows: z.number().int(),
  rowCount: z.number().int().optional(),
  imported: z.number().int(),
  importedCount: z.number().int().optional(),
  futureDated: z.number().int(),
  futureDatedCount: z.number().int().optional(),
  duplicate: z.number().int(),
  duplicateCount: z.number().int().optional(),
  rejected: z.number().int(),
  rejectedCount: z.number().int().optional(),
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
