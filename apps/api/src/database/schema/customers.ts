import {
  pgTable,
  text,
  date,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { riskProfiles } from './risk-profiles.js';
import { goals } from './goals.js';

export const customers = pgTable(
  'customers',
  {
    customerId: text('customer_id').primaryKey(), // C0001..C0120
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    city: text('city').notNull(),
    state: text('state').notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    onboardedAt: date('onboarded_at').notNull(),
    kycStatus: text('kyc_status').notNull(), // CHECK ('VERIFIED','PENDING','REVIEW')
    segment: text('segment').notNull(), // CHECK ('Mass','Affluent','HNI')
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'customers_kyc_status_check',
      sql`${table.kycStatus} IN ('VERIFIED','PENDING','REVIEW')`,
    ),
    check(
      'customers_segment_check',
      sql`${table.segment} IN ('Mass','Affluent','HNI')`,
    ),
    index('idx_customers_segment').on(table.segment),
    index('idx_customers_kyc').on(table.kycStatus),
    // Full-text search index (name, email, city, customer_id)
    index('idx_customers_search').using(
      'gin',
      sql`to_tsvector('simple', ${table.fullName} || ' ' || ${table.email} || ' ' || ${table.city} || ' ' || ${table.customerId})`,
    ),
  ],
);

export const customersRelations = relations(customers, ({ many, one }) => ({
  accounts: many(accounts),
  riskProfile: one(riskProfiles, {
    fields: [customers.customerId],
    references: [riskProfiles.customerId],
  }),
  goals: many(goals),
}));

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
