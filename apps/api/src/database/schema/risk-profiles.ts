import {
  pgTable,
  text,
  date,
  timestamp,
  smallint,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { customers } from './customers.js';

export const riskProfiles = pgTable(
  'risk_profiles',
  {
    customerId: text('customer_id')
      .primaryKey()
      .references(() => customers.customerId),
    riskScore: smallint('risk_score').notNull(), // CHECK (0..100)
    riskLevel: text('risk_level').notNull(), // CHECK ('Conservative','Moderate','Growth','Aggressive')
    assessedAt: date('assessed_at').notNull(),
    horizonYears: smallint('horizon_years').notNull(), // CHECK (> 0)
    liquidityNeed: text('liquidity_need').notNull(), // CHECK ('LOW','MEDIUM','HIGH')
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'risk_profiles_score_check',
      sql`${table.riskScore} BETWEEN 0 AND 100`,
    ),
    check(
      'risk_profiles_level_check',
      sql`${table.riskLevel} IN ('Conservative','Moderate','Growth','Aggressive')`,
    ),
    check('risk_profiles_horizon_check', sql`${table.horizonYears} > 0`),
    check(
      'risk_profiles_liquidity_check',
      sql`${table.liquidityNeed} IN ('LOW','MEDIUM','HIGH')`,
    ),
  ],
);

export const riskProfilesRelations = relations(riskProfiles, ({ one }) => ({
  customer: one(customers, {
    fields: [riskProfiles.customerId],
    references: [customers.customerId],
  }),
}));

export type RiskProfile = typeof riskProfiles.$inferSelect;
export type NewRiskProfile = typeof riskProfiles.$inferInsert;
