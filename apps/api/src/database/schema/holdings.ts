import {
  pgTable,
  text,
  date,
  timestamp,
  numeric,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { instruments } from './instruments.js';

export const holdingsSnapshot = pgTable(
  'holdings_snapshot',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.accountId),
    instrumentId: text('instrument_id')
      .notNull()
      .references(() => instruments.instrumentId),
    quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull(), // CHECK (>= 0)
    avgCost: numeric('avg_cost', { precision: 18, scale: 4 }).notNull(), // CHECK (>= 0)
    snapshotDate: date('snapshot_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.accountId, table.instrumentId, table.snapshotDate],
    }),
    check('holdings_quantity_check', sql`${table.quantity} >= 0`),
    check('holdings_avg_cost_check', sql`${table.avgCost} >= 0`),
    index('idx_holdings_account').on(table.accountId),
  ],
);

export const holdingsSnapshotRelations = relations(
  holdingsSnapshot,
  ({ one }) => ({
    account: one(accounts, {
      fields: [holdingsSnapshot.accountId],
      references: [accounts.accountId],
    }),
    instrument: one(instruments, {
      fields: [holdingsSnapshot.instrumentId],
      references: [instruments.instrumentId],
    }),
  }),
);

export type HoldingSnapshot = typeof holdingsSnapshot.$inferSelect;
export type NewHoldingSnapshot = typeof holdingsSnapshot.$inferInsert;
