import {
  pgTable,
  text,
  timestamp,
  bigserial,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(), // bcrypt hash
    role: text('role').notNull(), // CHECK ('VIEWER','ADMIN')
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('users_role_check', sql`${table.role} IN ('VIEWER','ADMIN')`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
