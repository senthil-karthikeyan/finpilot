'use client';

import React from 'react';
import Link from 'next/link';
import { inr, inr0, fmtDate, sgn, pnlClass, cap } from '@/lib/formatters';
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants';
import type { AccountPortfolio } from '@finpilot/shared';

interface AccountsListCardProps {
  customerId: string;
  accounts: AccountPortfolio[];
}

export function AccountsListCard({ customerId, accounts }: AccountsListCardProps) {
  return (
    <section className="panel" aria-labelledby="acc-heading">
      <div className="panel-head" style={{ paddingBottom: '12px' }}>
        <h2 className="panel-title" id="acc-heading">
          Accounts
        </h2>
        <Link href={`/customers/${customerId}/positions`} className="text-sm">
          All positions
        </Link>
      </div>

      <div className="rows">
        {accounts.length ? (
          accounts.map((a) => {
            const typeLabel = ACCOUNT_TYPE_LABELS[a.accountType] || cap(a.accountType);
            const statusClass =
              a.status === 'ACTIVE' ? 'ok' : a.status === 'DORMANT' ? 'warn' : '';

            return (
              <div key={a.accountId} className="rowitem acct-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/customers/${customerId}/positions?account=${a.accountId}`}
                      className="font-semibold hover:text-[var(--indigo)]"
                    >
                      {a.accountId}
                    </Link>
                    <span className="badge outline">{typeLabel}</span>
                    <span className={`badge ${statusClass}`}>{cap(a.status)}</span>
                  </div>
                  <div className="text-[var(--ink-2)] text-[13.5px] mt-1">
                    {a.provider}, opened {fmtDate(a.openedAt)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {a.positions.length ? (
                    <>
                      <b>{inr(a.totalMarketValue)}</b>
                      <div
                        className={pnlClass(a.totalUnrealisedPnl)}
                        style={{ fontSize: '13px' }}
                      >
                        {sgn(a.totalUnrealisedPnl)}
                        {inr0(Math.abs(a.totalUnrealisedPnl))}
                      </div>
                    </>
                  ) : (
                    <span className="faint">No positions</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <p className="text-[var(--ink-2)]">No accounts linked to this customer.</p>
          </div>
        )}
      </div>
    </section>
  );
}

