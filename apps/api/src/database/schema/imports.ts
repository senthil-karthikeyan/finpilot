import {
  pgTable,
  text,
  timestamp,
  integer,
  bigserial,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { transactions } from './transactions.js';

export const importBatches = pgTable(
  'import_batches',
  {
    batchId: text('batch_id').primaryKey(), // IMP-0001, etc.
    fileName: text('filename').notNull(),
    importedBy: text('imported_by').notNull(), // user email
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    rowCount: integer('row_count').notNull().default(0),
    importedCount: integer('imported_count').notNull().default(0),
    duplicateCount: integer('duplicate_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    futureDatedCount: integer('future_dated_count').notNull().default(0), // [CHANGED] was quarantine_count
    durationMs: integer('duration_ms'),
    status: text('status').notNull().default('COMPLETED'), // CHECK ('COMPLETED','FAILED')
  },
  (table) => [
    check(
      'import_batches_status_check',
      sql`${table.status} IN ('COMPLETED','FAILED')`,
    ),
  ],
);

export const importRows = pgTable(
  'import_rows',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    batchId: text('batch_id')
      .notNull()
      .references(() => importBatches.batchId),
    lineNumber: integer('line_number').notNull(),
    transactionId: text('transaction_id'),
    outcome: text('outcome').notNull(), // CHECK ('imported','future_dated','duplicate','rejected')
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'import_rows_outcome_check',
      sql`${table.outcome} IN ('imported','future_dated','duplicate','rejected')`,
    ),
    index('idx_import_rows_batch').on(table.batchId),
  ],
);

export const importBatchesRelations = relations(importBatches, ({ many }) => ({
  rows: many(importRows),
  transactions: many(transactions),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  batch: one(importBatches, {
    fields: [importRows.batchId],
    references: [importBatches.batchId],
  }),
}));

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;
export type ImportRow = typeof importRows.$inferSelect;
export type NewImportRow = typeof importRows.$inferInsert;
