import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../constants/index.js';

// ── Pagination ───────────────────────────────────────────────────────────────

/**
 * Query-string schema for paginated endpoints.
 * `z.coerce.number()` converts the raw string values that come from query params.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Pagination metadata returned on every paginated response. */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Factory that wraps any item schema in the standard paginated envelope.
 * Usage: PaginatedResponseSchema(CustomerSummarySchema)
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });

// ── API error model ──────────────────────────────────────────────────────────

/**
 * The shape every error response from /api/v1 follows.
 * The frontend uses this to show consistent toasts and inline messages.
 */
export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  /** Can be a single message or an array of field-level validation messages. */
  message: z.union([z.string(), z.array(z.string())]),
  /** Mirrors the X-Correlation-Id response header for log correlation. */
  correlationId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

