import { z } from 'zod';
import { GOAL_TYPES, GOAL_PRIORITIES } from '../constants/index.js';

// ── Shared helper: calendar-date-only comparison ─────────────────────────────

/**
 * Parses a YYYY-MM-DD string and returns true if it is today or later.
 * Comparison is date-only (not timestamp) to avoid timezone-edge-case bugs.
 */
export function isDateTodayOrLater(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return dateStr >= today;
}

// ── Goal item ────────────────────────────────────────────────────────────────

export const GoalSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string(),
  name: z.string(),
  type: z.enum(GOAL_TYPES),
  priority: z.enum(GOAL_PRIORITIES),
  targetAmount: z.number(),   // INR
  currentAmount: z.number(),  // INR — funded so far
  fundedPct: z.number(),      // 0–100+; can exceed 100 if overfunded
  targetDate: z.string(),     // ISO date YYYY-MM-DD
  isOverdue: z.boolean(),     // targetDate < today AND not fully funded
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

// ── Create goal (POST /customers/:id/goals) ──────────────────────────────────

export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  type: z.enum(GOAL_TYPES, { message: 'Invalid goal type.' }),
  priority: z.enum(GOAL_PRIORITIES, { message: 'Invalid priority.' }),
  targetAmount: z.number().positive('Target amount must be positive.'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative.').default(0),
  // Create rule: targetDate must be today or later.
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .refine(isDateTodayOrLater, {
      message: 'Target date must be today or in the future.',
    }),
});
export type CreateGoal = z.infer<typeof CreateGoalSchema>;

// ── Update goal (PATCH /goals/:goalId) ───────────────────────────────────────

/**
 * All fields are optional on PATCH.
 *
 * Target-date validation rules (backend enforces, frontend mirrors):
 *  • Field absent from body → skip date validation entirely.
 *  • Field present + unchanged → validated by backend via DB lookup (allowed if past).
 *  • Field present + changed to a new value → must be today or later.
 *
 * The backend performs the "unchanged" check by comparing with the stored value,
 * so the frontend simply sends whatever the user picked and the API will reject
 * a new past date with a 422.
 */
export const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(GOAL_TYPES).optional(),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  // When present, the backend checks if the value changed; if changed, enforces >= today.
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .optional(),
});
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;

