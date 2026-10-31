# @finpilot/shared — Domain Contracts, Schemas & Constants

This package serves as the single source of truth across the FinPilot monorepo, sharing runtime Zod validation schemas, TypeScript contract types, and domain constants between `apps/api` and `apps/web`.

---

## 1. Contents

### A. Constants (`src/constants/index.ts`)
- `USER_ROLES`: `'VIEWER'`, `'ADMIN'`
- `AUTH_COOKIE_NAME`: `'finpilot_token'`
- `ASSET_CLASSES`: `'EQUITY'`, `'ETF'`, `'MUTUAL_FUND'`, `'BOND'`, `'REIT'`, `'GSEC'`
- `TRANSACTION_TYPES`: `'BUY'`, `'SELL'`, `'DIVIDEND'`, `'FEE'`
- `TRANSACTION_STATUSES`: `'SETTLED'`, `'PENDING'`, `'REVERSED'`
- `GOAL_TYPES`: `'EMERGENCY_FUND'`, `'EDUCATION'`, `'RETIREMENT'`, `'TRAVEL'`, `'WEALTH_CREATION'`, `'HOME_PURCHASE'`
- `GOAL_PRIORITIES`: `'LOW'`, `'MEDIUM'`, `'HIGH'`
- `ACCOUNT_TYPES`: `'BROKERAGE'`, `'MUTUAL_FUND'`, `'RETIREMENT'`
- `ACCOUNT_STATUSES`: `'ACTIVE'`, `'DORMANT'`, `'CLOSED'`
- `KYC_STATUSES`: `'VERIFIED'`, `'PENDING'`, `'REVIEW'`
- `CUSTOMER_SEGMENTS`: `'Mass'`, `'Affluent'`, `'HNI'`

### B. Validation Schemas (`src/schemas/`)
- `auth.ts`: `loginSchema`, `loginResponseSchema`
- `customer.ts`: `customerSearchQuerySchema`, `customerSummarySchema`, `customerProfileSchema`
- `goal.ts`: `createGoalSchema`, `updateGoalSchema` (with non-retroactive target date validation)
- `import.ts`: `importBatchSummarySchema`, `importRowOutcomeSchema`
- `portfolio.ts`: `portfolioSummarySchema`, `positionItemSchema`, `monthlyCashFlowItemSchema`
- `transaction.ts`: `transactionFilterQuerySchema`, `transactionItemSchema`

### C. TypeScript API Contracts (`src/types/api.ts`)
- Strongly-typed DTOs and API response envelopes used by frontend API clients and backend controllers.

---

## 2. Available Scripts

From the repository root or inside `packages/shared`:

```bash
# Compile TypeScript source files to dist/
pnpm --filter @finpilot/shared build

# Strict type-checking
pnpm --filter @finpilot/shared type-check
```

