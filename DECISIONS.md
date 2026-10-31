# FinPilot — Architecture & Engineering Decisions (`DECISIONS.md`)

This document records the foundational architecture, security, database design, and library decisions established during the design and implementation of FinPilot.

---

## 1. Monorepo Architecture & Package Boundaries

- **Tooling:** `pnpm` workspaces (v11.10.0) with strict hoisted dependency isolation.
- **`packages/shared`:** Serves as the single source of truth for Zod validation schemas, TypeScript contract types, and shared constants (`GOAL_TYPES`, `TRANSACTION_TYPES`, `ASSET_CLASSES`, `USER_ROLES`).
- **`apps/api`:** NestJS 12 REST API providing modular endpoints (`auth`, `customers`, `portfolio`, `transactions`, `goals`, `admin`), dependency injection, and Drizzle ORM integration.
- **`apps/web`:** Next.js 16 (React 19) App Router frontend implementing Partial Prerendering (PPR), Turbopack, Tailwind CSS v4, and Radix UI accessible primitives.

---

## 2. Authentication & Security Architecture

1. **httpOnly Cookie Sessions:**
   - JWT tokens are issued and stored strictly inside `httpOnly`, `sameSite=lax` cookies named `finpilot_token`.
   - **Explicitly Rejected:** Storing JWT tokens in `localStorage` or `sessionStorage` was permanently rejected to prevent cross-site scripting (XSS) token exfiltration.
2. **Brute-Force & Rate Limiting:**
   - The login endpoint (`POST /auth/login`) is throttled to 5 requests per 60 seconds per IP using `@nestjs/throttler`.
3. **Supply-Chain Safeguard:**
   - `pnpm-workspace.yaml` enforces `minimumReleaseAge: 10080` (7 days), blocking automatic installation of freshly published packages vulnerable to dependency confusion.

---

## 3. Database & Anomaly Reconciliation Strategy

1. **Immutable Ledger Integrity:**
   - In compliance with financial regulations, ingestion never overwrites, alters, or silently drops valid transactions.
2. **In-Ledger Flagging vs. Quarantine Tables:**
   - **Decision:** Future-dated transactions are preserved directly in the main `transactions` ledger with `is_future = true`.
   - **Rejected Alternative:** A separate `transactions_quarantine` table was rejected to avoid split-ledger schema drift and complex distributed joins.
   - **Cash Flow Exclusion:** Trailing 12-month net cash flow aggregation dynamically excludes `is_future = true` transactions to ensure reporting accuracy.
3. **Audit Trail for Ingestion Failures:**
   - Malformed rows (invalid FKs, negative amounts, bad dates, or duplicate IDs with mismatched values) are quarantined in the `import_rows` audit table along with file line provenance, errorCode, and rejection reason.
4. **Holdings Snapshot Deduplication:**
   - Duplicate holdings records for the same `(account_id, instrument_id, snapshot_date)` are collapsed onto their natural key rather than silently summed.
5. **Numeric Precision:**
   - Currency amounts and quantities are modeled as `numeric(18, 4)` and `numeric(18, 2)` in PostgreSQL to prevent IEEE 754 floating-point inaccuracies.

---

## 4. Frontend Design & Performance Choices

1. **Design System & Mock Fidelity:**
   - Faithfully follows the visual tokens, typography (`Instrument Serif` display headers, `Public Sans` body), color palette (`--indigo`, `--surface`, `--gain`, `--loss`), sidebar rail, card surfaces, and table styles from `docs/finpilot-mock.html`.
2. **Next.js 16 Partial Prerendering (PPR):**
   - Dynamic pages (`/customers/[id]`, `/customers/[id]/positions`, `/customers/[id]/transactions`, `/customers/[id]/goals`) wrap client route parameters in `<Suspense>` boundaries to allow static shell prerendering combined with server-streaming dynamic content.
3. **React 19 Pure Render Invariants:**
   - Avoided non-deterministic `Date.now()` calls during rendering. Calendar math uses the deterministic synthetic reference date (`SYSTEM_TODAY = '2026-10-31'`) to avoid hydration mismatches.
   - Form dialog state resets are handled via component keys (`key={goal ? goal.id : 'new'}`) rather than calling `setState` inside `useEffect`, preventing cascading renders.
4. **Radix UI Dialogs:**
   - Modals utilize `@radix-ui/react-dialog` for focus trapping, keyboard navigation (`Escape` handling), screen-reader labels, and backdrop blur.

---

## 5. Deliberately Deferred Scope

The following capabilities were intentionally excluded from this internal operations MVP:
- **Real-Time Price Streaming:** Synthetic static snapshot prices (`price_as_of`) were specified for all valuation logic.
- **Multi-Currency FX Engine:** All portfolios and transactions are denominated and settled in INR (`₹`).
- **External Notifications (Email/SMS):** Audit logs and in-app toasts provide operations feedback.
- **External Cloud Deployments:** Standard multi-stage Docker Compose orchestration provided for local operations.

