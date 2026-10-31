'use client';

import React from 'react';
import Link from 'next/link';
import { fmtDate, inr0, sgn, pnlClass, cap } from '@/lib/formatters';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import type { Transaction } from '@finpilot/shared';

interface RecentTransactionsCardProps {
  customerId: string;
  transactions: Transaction[];
  totalTransactions: number;
}

export function RecentTransactionsCard({
  customerId,
  transactions,
  totalTransactions,
}: RecentTransactionsCardProps) {
  return (
    <section className="panel" aria-labelledby="rt-heading">
      <div className="panel-head" style={{ paddingBottom: '10px' }}>
        <h2 className="panel-title" id="rt-heading">
          Recent transactions
        </h2>
        <Link href={`/customers/${customerId}/transactions`} className="text-sm">
          See all {totalTransactions}
        </Link>
      </div>

      {transactions.length ? (
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Instrument</th>
                <th scope="col">Type</th>
                <th scope="col" className="num">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const isReversed = t.status === 'REVERSED';
                const isPending = t.status === 'PENDING';
                const rowClass = isReversed
                  ? 'tx-reversed'
                  : isPending
                    ? 'tx-pending'
                    : '';

                // Cash effect: sell/dividend is positive cash inflow, buy/fee is cash outflow
                const isCashIn = t.type === 'SELL' || t.type === 'DIVIDEND';
                const signedAmount = isCashIn ? t.amount : -t.amount;
                const typeLabel = TRANSACTION_TYPE_LABELS[t.type] || cap(t.type);

                return (
                  <tr key={t.id || t.transactionId} className={rowClass}>
                    <td>{fmtDate(t.tradeDate)}</td>
                    <td className="font-medium">{t.symbol || '—'}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{typeLabel}</span>
                        {t.status !== 'SETTLED' && (
                          <span
                            className={`badge ${
                              t.status === 'PENDING' ? 'warn' : 'bad'
                            }`}
                          >
                            {cap(t.status)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`num ${
                        isReversed ? '' : pnlClass(signedAmount)
                      }`}
                    >
                      {sgn(signedAmount)}
                      {inr0(Math.abs(signedAmount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <p className="text-[var(--ink-2)]">No transactions recorded for this customer.</p>
        </div>
      )}
    </section>
  );
}

