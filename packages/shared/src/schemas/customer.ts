import { z } from 'zod';
import { CUSTOMER_SEGMENTS, KYC_STATUSES, RISK_LEVELS } from '../constants/index.js';

// ── Customer list item (used in GET /customers) ──────────────────────────────

export const CustomerSummarySchema = z.object({
  id: z.string(), // e.g. "C0001"
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  segment: z.enum(CUSTOMER_SEGMENTS),
  kycStatus: z.enum(KYC_STATUSES),
  accountCount: z.number().int(),
  aum: z.number(), // total AUM in INR (from portfolio positions)
  riskLevel: z.enum(RISK_LEVELS).nullable(),
});
export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

// ── Customer detail (used in GET /customers/:id) ─────────────────────────────

export const CustomerDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  segment: z.enum(CUSTOMER_SEGMENTS),
  kycStatus: z.enum(KYC_STATUSES),
  dateOfBirth: z.string().nullable(),
  onboardedAt: z.string(),
  createdAt: z.string(),
  totalAum: z.number(),
  riskProfile: z
    .object({
      score: z.number().int(),
      level: z.enum(RISK_LEVELS),
      assessedAt: z.string(),
      horizonYears: z.number().int(),
      liquidityNeed: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    })
    .nullable(),
  accounts: z.array(
    z.object({
      accountId: z.string(),
      accountType: z.enum(['BROKERAGE', 'MUTUAL_FUND', 'RETIREMENT']),
      provider: z.string(),
      openedAt: z.string(),
      status: z.enum(['ACTIVE', 'DORMANT', 'CLOSED']),
      baseCurrency: z.string(),
      aum: z.number(),
    }),
  ),
});
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;

// ── Query-string filter schema for GET /customers ────────────────────────────

export const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  segment: z.enum(CUSTOMER_SEGMENTS).optional(),
  kycStatus: z.enum(KYC_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'aum', 'onboardedAt', 'id']).default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});
