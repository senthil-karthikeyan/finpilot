import {
  pgTable,
  text,
  date,
  timestamp,
  numeric,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { holdingsSnapshot } from './holdings.js';
import { transactions } from './transactions.js';

export const instruments = pgTable(
  'instruments',
  {
    instrumentId: text('instrument_id').primaryKey(), // I0001..I0080
    symbol: text('symbol').notNull().unique(),
    instrumentName: text('instrument_name').notNull(),
    assetClass: text('asset_class').notNull(), // CHECK ('EQUITY','ETF','MUTUAL_FUND','BOND','REIT','GSEC')
    sector: text('sector'), // NULL for non-equity
    exchange: text('exchange').notNull(), // CHECK ('NSE','BSE','OTC')
    currency: text('currency').notNull().default('INR'),
    lastPrice: numeric('last_price', { precision: 18, scale: 4 }).notNull(),
    priceAsOf: date('price_as_of').notNull(),
    riskBand: text('risk_band').notNull(), // CHECK ('LOW','MEDIUM','HIGH')
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'instruments_asset_class_check',
      sql`${table.assetClass} IN ('EQUITY','ETF','MUTUAL_FUND','BOND','REIT','GSEC')`,
    ),
    check(
      'instruments_exchange_check',
      sql`${table.exchange} IN ('NSE','BSE','OTC')`,
    ),
    check('instruments_last_price_check', sql`${table.lastPrice} >= 0`),
    check(
      'instruments_risk_band_check',
      sql`${table.riskBand} IN ('LOW','MEDIUM','HIGH')`,
    ),
  ],
);

export const instrumentsRelations = relations(instruments, ({ many }) => ({
  holdings: many(holdingsSnapshot),
  transactions: many(transactions),
}));

export type Instrument = typeof instruments.$inferSelect;
export type NewInstrument = typeof instruments.$inferInsert;
