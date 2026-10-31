'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  LayoutDashboard,
  PieChart,
  ArrowLeftRight,
  Target,
  Upload,
  ShieldCheck,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/hooks/use-auth';

interface CustomerContextData {
  id: string;
  name: string;
  segment?: string;
  kycStatus?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  customerContext?: CustomerContextData;
}

export function AppShell({ children, customerContext }: AppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Derive customer ID from context or path if on /customers/:id
  const customerMatch = pathname.match(/^\/customers\/([^\/]+)/);
  const currentCustomerId = customerContext?.id || (customerMatch ? customerMatch[1] : null);

  const isCustomersActive = pathname === '/customers';
  const isOverviewActive = currentCustomerId && pathname === `/customers/${currentCustomerId}`;
  const isPositionsActive = currentCustomerId && pathname === `/customers/${currentCustomerId}/positions`;
  const isTransactionsActive = currentCustomerId && pathname === `/customers/${currentCustomerId}/transactions`;
  const isGoalsActive = currentCustomerId && pathname === `/customers/${currentCustomerId}/goals`;

  const isImportsActive = pathname.startsWith('/admin/imports');
  const isDataQualityActive = pathname.startsWith('/admin/data-quality');

  return (
    <div className="shell">
      {/* ── Sidebar Rail ── */}
      <aside className={`rail ${isMobileOpen ? 'open flex fixed inset-y-0 left-0 z-50 shadow-2xl' : ''}`}>
        <Link href="/customers" className="brand" onClick={() => setIsMobileOpen(false)}>
          <BrandLogo className="w-[22px] h-[22px]" />
          <span className="brand-name">FinPilot</span>
        </Link>

        {/* WORKSPACE Group */}
        <div className="nav-group">Workspace</div>
        <Link
          href="/customers"
          className={`nav-item ${isCustomersActive ? 'active' : ''}`}
          aria-current={isCustomersActive ? 'page' : undefined}
          onClick={() => setIsMobileOpen(false)}
        >
          <Users className="w-4 h-4 ico" />
          <span>Customers</span>
        </Link>

        {/* Customer Context Sub-Navigation (if customer selected) */}
        {currentCustomerId && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="nav-ctx">
              <strong>{customerContext?.name || currentCustomerId}</strong>
              <div className="flex items-center gap-1.5 mt-1">
                <span>{currentCustomerId}</span>
                {customerContext?.segment && (
                  <span className="badge outline text-[11px] py-0 px-1 text-slate-300">
                    {customerContext.segment}
                  </span>
                )}
                {customerContext?.kycStatus && (
                  <span
                    className={`badge text-[11px] py-0 px-1 ${
                      customerContext.kycStatus === 'VERIFIED' ? 'ok' : 'warn'
                    }`}
                  >
                    {customerContext.kycStatus}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/customers/${currentCustomerId}`}
              className={`nav-item nav-sub ${isOverviewActive ? 'active' : ''}`}
              aria-current={isOverviewActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <LayoutDashboard className="w-3.5 h-3.5 ico" />
              <span>Overview</span>
            </Link>

            <Link
              href={`/customers/${currentCustomerId}/positions`}
              className={`nav-item nav-sub ${isPositionsActive ? 'active' : ''}`}
              aria-current={isPositionsActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <PieChart className="w-3.5 h-3.5 ico" />
              <span>Positions</span>
            </Link>

            <Link
              href={`/customers/${currentCustomerId}/transactions`}
              className={`nav-item nav-sub ${isTransactionsActive ? 'active' : ''}`}
              aria-current={isTransactionsActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 ico" />
              <span>Transactions</span>
            </Link>

            <Link
              href={`/customers/${currentCustomerId}/goals`}
              className={`nav-item nav-sub ${isGoalsActive ? 'active' : ''}`}
              aria-current={isGoalsActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <Target className="w-3.5 h-3.5 ico" />
              <span>Goals</span>
            </Link>
          </div>
        )}

        {/* OPERATIONS Group (Admin Only) */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="nav-group mt-4">Operations</div>
            <Link
              href="/admin/imports"
              className={`nav-item ${isImportsActive ? 'active' : ''}`}
              aria-current={isImportsActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <Upload className="w-4 h-4 ico" />
              <span>Import CSV</span>
            </Link>
            <Link
              href="/admin/data-quality"
              className={`nav-item ${isDataQualityActive ? 'active' : ''}`}
              aria-current={isDataQualityActive ? 'page' : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              <ShieldCheck className="w-4 h-4 ico" />
              <span>Data Quality</span>
            </Link>
          </>
        )}

        {/* Rail Footer */}
        <div className="rail-foot">
          <div className="who">
            <div>
              <b>{user?.name || 'Service User'}</b>
              <div className="text-[11.5px] text-[#aab3e0]">{user?.email}</div>
            </div>
            <span className="badge outline text-[11px] text-slate-300 py-0.5">
              {user?.role || 'VIEWER'}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <div className="health">
              <span className="dot ok" />
              <span>API healthy</span>
            </div>
            <button
              type="button"
              className="signout inline-flex items-center gap-1.5"
              onClick={() => logout()}
              title="Sign out of FinPilot"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen min-w-0">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[var(--indigo-deep)] text-white sticky top-0 z-30 shadow">
          <Link href="/customers" className="flex items-center gap-2">
            <BrandLogo className="w-5 h-5" />
            <span className="brand-name text-xl">FinPilot</span>
          </Link>
          <button
            type="button"
            className="p-1 rounded hover:bg-white/10"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}

