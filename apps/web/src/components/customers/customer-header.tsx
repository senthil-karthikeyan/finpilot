'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { fmtDate } from '@/lib/formatters';
import type { CustomerDetail } from '@finpilot/shared';

interface CustomerHeaderProps {
  customer: CustomerDetail;
  activeTab: 'overview' | 'positions' | 'transactions' | 'goals';
}

export function CustomerHeader({ customer, activeTab }: CustomerHeaderProps) {
  const { id, name, email, phone, city, state, segment, kycStatus, onboardedAt } = customer;
  const [targetTab, setTargetTab] = useState<string | null>(null);

  // Derived pending state: active until the route transition completes and activeTab matches
  const pendingTab = targetTab !== activeTab ? targetTab : null;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/customers">Customers</Link>
        <span className="sep" aria-hidden="true">
          /
        </span>
        <span>{name}</span>
      </nav>

      <header className="page-head">
        <div>
          <h1 className="h1">{name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="code">{id}</span>
            {kycStatus === 'VERIFIED' && <span className="badge ok">KYC verified</span>}
            {kycStatus === 'PENDING' && <span className="badge warn">KYC pending</span>}
            {kycStatus === 'REVIEW' && <span className="badge bad">KYC in review</span>}
            <span className="badge outline">{segment}</span>
            <span className="text-[var(--ink-2)]">
              {city}, {state}
            </span>
          </div>
        </div>

        <div className="contact text-[var(--ink-2)]">
          <div>{email}</div>
          {phone && <div>{phone}</div>}
          <div>Customer since {fmtDate(onboardedAt)}</div>
        </div>
      </header>

      <nav className="tabs" aria-label="Customer sections">
        <Link
          className="tab inline-flex items-center gap-1.5"
          href={`/customers/${id}`}
          aria-current={activeTab === 'overview' ? 'page' : undefined}
          onClick={() => {
            if (activeTab !== 'overview') setTargetTab('overview');
          }}
        >
          <span>Overview</span>
          {pendingTab === 'overview' && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
          )}
        </Link>
        <Link
          className="tab inline-flex items-center gap-1.5"
          href={`/customers/${id}/positions`}
          aria-current={activeTab === 'positions' ? 'page' : undefined}
          onClick={() => {
            if (activeTab !== 'positions') setTargetTab('positions');
          }}
        >
          <span>Positions</span>
          {pendingTab === 'positions' && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
          )}
        </Link>
        <Link
          className="tab inline-flex items-center gap-1.5"
          href={`/customers/${id}/transactions`}
          aria-current={activeTab === 'transactions' ? 'page' : undefined}
          onClick={() => {
            if (activeTab !== 'transactions') setTargetTab('transactions');
          }}
        >
          <span>Transactions</span>
          {pendingTab === 'transactions' && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
          )}
        </Link>
        <Link
          className="tab inline-flex items-center gap-1.5"
          href={`/customers/${id}/goals`}
          aria-current={activeTab === 'goals' ? 'page' : undefined}
          onClick={() => {
            if (activeTab !== 'goals') setTargetTab('goals');
          }}
        >
          <span>Goals</span>
          {pendingTab === 'goals' && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
          )}
        </Link>
      </nav>
    </>
  );
}
