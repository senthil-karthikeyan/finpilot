import {
  pgTable,
  text,
  date,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { holdingsSnapshot } from './holdings.js';
import { transactions } from './transactions.js';

export const accounts = pgTable(
  'accounts',
  {
    accountId: text('account_id').primaryKey(), // A00001..A00167
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.customerId),
    accountType: text('account_type').notNull(), // CHECK ('BROKERAGE','MUTUAL_FUND','RETIREMENT')
    provider: text('provider').notNull(),
    openedAt: date('opened_at').notNull(),
    status: text('status').notNull(), // CHECK ('ACTIVE','DORMANT','CLOSED')
    baseCurrency: text('base_currency').notNull().default('INR'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'accounts_account_type_check',
      sql`${table.accountType} IN ('BROKERAGE','MUTUAL_FUND','RETIREMENT')`,
    ),
    check(
      'accounts_status_check',
      sql`${table.status} IN ('ACTIVE','DORMANT','CLOSED')`,
    ),
    index('idx_accounts_customer').on(table.customerId),
  ],
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [accounts.customerId],
    references: [customers.customerId],
  }),
  holdings: many(holdingsSnapshot),
  transactions: many(transactions),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
