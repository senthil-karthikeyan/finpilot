# @finpilot/web — FinPilot Frontend Web Application

The frontend application for FinPilot is built with Next.js 16 (React 19), Tailwind CSS v4, Radix UI Primitives, TanStack Query v5, and Recharts.

---

## 1. Responsibilities

- **Wealth Operations Dashboard:** Responsive desktop and tablet dashboard allowing wealth service users to search customers, inspect portfolio valuations, explore positions, and review trailing 12-month net cash flow.
- **Next.js 16 Partial Prerendering (PPR):** Uses `<Suspense>` boundaries to statically prerender application shells (navigation rails, customer headers, tab layouts) while streaming dynamic account and transaction data from the backend.
- **Session Cookie & Server-Side Proxy:** The Next.js app owns the user's session. After login, JWT tokens are stored in an `httpOnly`, `SameSite=Lax` cookie (`finpilot_token`). Browser requests to `/api/*` are handled by a server-side route handler (`/app/api/[...path]/route.ts`) that attaches `Authorization: Bearer <token>` to upstream requests to the NestJS API.
- **Global Authentication Error Interception:** TanStack Query cache automatically catches HTTP 401 responses, triggers a session expiration toast via Sonner, and redirects to `/login`.
- **Operations CSV Ingestion Stepper:** Interactive drag-and-drop file upload, real-time 4-stage validation progress, outcomes summary, and quarantined CSV download for operations admins.

---

## 2. Directory Structure

```text
apps/web/
├── Dockerfile                  # Multi-stage production container build (standalone runner)
├── next.config.ts              # Output: 'standalone', Turbopack, and PPR configuration
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── admin/
│   │   │   ├── data-quality/   # Ledger anomaly audit page
│   │   │   └── imports/        # CSV upload stepper and history page
│   │   ├── api/[...path]/      # Server-side proxy route forwarding requests with Bearer auth
│   │   ├── customers/
│   │   │   ├── page.tsx        # Customer directory and search page
│   │   │   └── [id]/           # Dynamic customer routes (PPR enabled)
│   │   │       ├── page.tsx    # Customer portfolio dashboard & cash flow
│   │   │       ├── goals/      # Financial goals management page
│   │   │       ├── positions/  # Portfolio positions table
│   │   │       └── transactions/# Paginated transactions ledger
│   │   ├── login/              # Sign-in page with demo credential pills
│   │   ├── logout/             # Session cookie clearing route handler
│   │   ├── layout.tsx          # Root layout with fonts, providers, and toaster
│   │   └── proxy.ts            # Proxy logic for upstream API token injection
│   ├── components/             # Reusable UI components
│   │   ├── admin/              # Import dropzone, stepper, and data quality tables
│   │   ├── auth/               # Protected route wrappers and session state
│   │   ├── customers/          # Customer header and directory cards
│   │   ├── goals/              # Goal creation/edit dialogs with Zod validation
│   │   ├── layout/             # Sidebar rail, header, and shell
│   │   └── portfolio/          # Portfolio hero, asset allocation, and cash flow charts
│   ├── hooks/                  # TanStack Query data hooks (usePortfolio, useTransactions, etc.)
│   ├── lib/                    # API client, formatters, and auth error handler
│   └── providers/              # QueryClientProvider and AuthProvider
└── __tests__/                  # Unit and formatter test suites (Vitest)
```

---

## 3. Available Scripts

From the repository root or inside `apps/web`:

```bash
# Run web application in Turbopack development mode (http://localhost:3000)
pnpm --filter @finpilot/web dev

# Run unit and formatter tests (88 tests)
pnpm --filter @finpilot/web test

# Strict TypeScript type-checking
pnpm --filter @finpilot/web type-check

# Run ESLint
pnpm --filter @finpilot/web lint

# Compile Next.js production build with standalone output
pnpm --filter @finpilot/web build
```

---

## 4. Key UI Routes

| Route | Description |
|---|---|
| `/login` | Authentication page with one-click demo credential auto-fill |
| `/customers` | Customer directory with full-text search, segment, and KYC filters |
| `/customers/[id]` | Consolidated customer portfolio dashboard, asset allocation chart, and cash-flow chart |
| `/customers/[id]/positions` | Per-position holdings breakdown with market value and unrealised P&L |
| `/customers/[id]/transactions` | Paginated transactions ledger with server-side filters and anomaly badges |
| `/customers/[id]/goals` | Financial goals tracking with funded progress bars and create/edit modal |
| `/admin/imports` | (Admin only) 4-stage CSV ingestion stepper, validation reports, and quarantine download |
| `/admin/data-quality` | (Admin only) System-wide data anomaly audit metrics |

