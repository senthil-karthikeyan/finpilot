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
  id: z.string(), // e.g. "G00001"
  goalId: z.string(), // e.g. "G00001"
  customerId: z.string(),
  name: z.string(),
  goalName: z.string(),
  type: z.enum(GOAL_TYPES),
  goalType: z.enum(GOAL_TYPES),
  priority: z.enum(GOAL_PRIORITIES),
  targetAmount: z.number(), // INR
  currentAmount: z.number(), // INR — funded so far
  currentFundedAmount: z.number(), // INR — funded so far
  fundedPct: z.number(), // 0–100+; can exceed 100 if overfunded
  targetDate: z.string(), // ISO date YYYY-MM-DD
  isOverdue: z.boolean(), // targetDate < today AND not fully funded
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

// ── Create goal (POST /customers/:id/goals) ──────────────────────────────────

export const CreateGoalSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters.')
    .max(60, 'Name must be at most 60 characters.')
    .optional(),
  goalName: z
    .string()
    .min(3, 'Name must be at least 3 characters.')
    .max(60, 'Name must be at most 60 characters.')
    .optional(),
  type: z.enum(GOAL_TYPES, { message: 'Invalid goal type.' }).optional(),
  goalType: z.enum(GOAL_TYPES, { message: 'Invalid goal type.' }).optional(),
  priority: z.enum(GOAL_PRIORITIES, { message: 'Invalid priority.' }),
  targetAmount: z.number().positive('Target amount must be positive.'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative.').default(0).optional(),
  currentFundedAmount: z.number().min(0, 'Funded amount cannot be negative.').default(0).optional(),
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
 */
export const UpdateGoalSchema = z.object({
  name: z.string().min(3).max(60).optional(),
  goalName: z.string().min(3).max(60).optional(),
  type: z.enum(GOAL_TYPES).optional(),
  goalType: z.enum(GOAL_TYPES).optional(),
  priority: z.enum(GOAL_PRIORITIES).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  currentFundedAmount: z.number().min(0).optional(),
  // When present, the backend checks if the value changed; if changed, enforces >= today.
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
    .optional(),
});
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
