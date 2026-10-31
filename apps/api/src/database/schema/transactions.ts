import {
  pgTable,
  text,
  date,
  timestamp,
  numeric,
  boolean,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { instruments } from './instruments.js';
import { importBatches } from './imports.js';

export const transactions = pgTable(
  'transactions',
  {
    transactionId: text('transaction_id').primaryKey(), // T0000001..T0004554
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.accountId),
    instrumentId: text('instrument_id').references(
      () => instruments.instrumentId,
    ), // NULL allowed: DIVIDEND/FEE rows
    transactionType: text('transaction_type').notNull(), // CHECK ('BUY','SELL','DIVIDEND','FEE')
    tradeDate: date('trade_date').notNull(),
    quantity: numeric('quantity', { precision: 18, scale: 6 })
      .notNull()
      .default('0'), // CHECK (>= 0)
    price: numeric('price', { precision: 18, scale: 4 }).notNull().default('0'), // CHECK (>= 0)
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(), // positive in ledger
    status: text('status').notNull(), // CHECK ('SETTLED','PENDING','REVERSED')

    // Data-quality anomaly flags
    isFuture: boolean('is_future').notNull().default(false), // trade_date > CURRENT_DATE at import time
    beforeOpenFlag: boolean('before_open_flag').notNull().default(false), // trade_date < account.opened_at
    onClosedFlag: boolean('on_closed_flag').notNull().default(false), // account.status = CLOSED at trade_date

    // Provenance
    importBatchId: text('import_batch_id').references(
      () => importBatches.batchId,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'transactions_type_check',
      sql`${table.transactionType} IN ('BUY','SELL','DIVIDEND','FEE')`,
    ),
    check('transactions_quantity_check', sql`${table.quantity} >= 0`),
    check('transactions_price_check', sql`${table.price} >= 0`),
    check(
      'transactions_status_check',
      sql`${table.status} IN ('SETTLED','PENDING','REVERSED')`,
    ),
    index('idx_tx_account_date').on(table.accountId, table.tradeDate.desc()),
    index('idx_tx_instrument')
      .on(table.instrumentId)
      .where(sql`${table.instrumentId} IS NOT NULL`),
    index('idx_tx_status').on(table.status),
    index('idx_tx_is_future')
      .on(table.isFuture)
      .where(sql`${table.isFuture} = true`),
    index('idx_tx_batch')
      .on(table.importBatchId)
      .where(sql`${table.importBatchId} IS NOT NULL`),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.accountId],
  }),
  instrument: one(instruments, {
    fields: [transactions.instrumentId],
    references: [instruments.instrumentId],
  }),
  importBatch: one(importBatches, {
    fields: [transactions.importBatchId],
    references: [importBatches.batchId],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
