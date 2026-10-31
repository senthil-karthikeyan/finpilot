import { z } from 'zod';
import { CUSTOMER_SEGMENTS, KYC_STATUSES, RISK_CATEGORIES } from '../constants/index.js';

// ── Customer list item (used in GET /customers) ──────────────────────────────

export const CustomerSummarySchema = z.object({
  id: z.string(),         // e.g. "C00001"
  name: z.string(),
  email: z.string().email(),
  city: z.string(),
  segment: z.enum(CUSTOMER_SEGMENTS),
  kycStatus: z.enum(KYC_STATUSES),
  accountCount: z.number().int(),
  aum: z.number(),        // total AUM in INR (from portfolio view)
});
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

// ── Customer detail (used in GET /customers/:id) ─────────────────────────────

export const CustomerDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  city: z.string(),
  country: z.string(),
  segment: z.enum(CUSTOMER_SEGMENTS),
  kycStatus: z.enum(KYC_STATUSES),
  dateOfBirth: z.string().nullable(), // ISO date string YYYY-MM-DD
  createdAt: z.string(),              // ISO timestamp
  riskProfile: z
    .object({
      category: z.enum(RISK_CATEGORIES),
      score: z.number().int(),
      assessedAt: z.string(),
    })
    .nullable(),
});
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;

// ── Query-string filter schema for GET /customers ────────────────────────────

export const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
  kycStatus: z.enum(KYC_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'aum', 'createdAt']).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});
export type CustomerQuery = z.infer<typeof CustomerQuerySchema>;

