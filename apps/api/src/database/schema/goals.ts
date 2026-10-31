import {
  pgTable,
  text,
  date,
  timestamp,
  numeric,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { customers } from './customers.js';

export const goals = pgTable(
  'goals',
  {
    goalId: text('goal_id').primaryKey(), // G00001..G00177
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.customerId),
    goalType: text('goal_type').notNull(), // CHECK ('EMERGENCY_FUND','EDUCATION','RETIREMENT','TRAVEL','WEALTH_CREATION','HOME_PURCHASE')
    goalName: text('goal_name').notNull(), // length between 3 and 60
    targetAmount: numeric('target_amount', {
      precision: 18,
      scale: 2,
    }).notNull(), // CHECK (> 0)
    currentFundedAmount: numeric('current_funded_amount', {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default('0'), // CHECK (>= 0)
    targetDate: date('target_date').notNull(),
    priority: text('priority').notNull(), // CHECK ('LOW','MEDIUM','HIGH')
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'goals_type_check',
      sql`${table.goalType} IN ('EMERGENCY_FUND','EDUCATION','RETIREMENT','TRAVEL','WEALTH_CREATION','HOME_PURCHASE')`,
    ),
    check(
      'goals_name_length_check',
      sql`length(${table.goalName}) BETWEEN 3 AND 60`,
    ),
    check('goals_target_amount_check', sql`${table.targetAmount} > 0`),
    check('goals_funded_amount_check', sql`${table.currentFundedAmount} >= 0`),
    check(
      'goals_priority_check',
      sql`${table.priority} IN ('LOW','MEDIUM','HIGH')`,
    ),
    index('idx_goals_customer').on(table.customerId),
  ],
);

export const goalsRelations = relations(goals, ({ one }) => ({
  customer: one(customers, {
    fields: [goals.customerId],
    references: [customers.customerId],
  }),
}));

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
