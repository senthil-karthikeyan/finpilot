'use client';

import React from 'react';
import { fmtCount } from '@/lib/formatters';
import type { DataQualityItem } from '@finpilot/shared';

interface DataQualityTableProps {
  items: DataQualityItem[];
  isLoading?: boolean;
}

const ANOMALY_TITLES: Record<string, string> = {
  future_dated: 'Future-dated transactions',
  before_open_date: 'Transactions before account opened_at',
  on_closed_account: 'Transactions on closed accounts',
  duplicate_transactions: 'Duplicate transaction IDs',
  invalid_references: 'Invalid account or instrument foreign keys',
  DUP_HOLDING: 'Duplicate rows in holdings snapshot',
  QUARANTINE: 'Transactions held in quarantine',
  TXN_BEFORE_OPEN: 'Transactions dated before the account opened',
  TXN_CLOSED_ACCT: 'Transactions on closed accounts',
  GOAL_NAME_TYPE: 'Goals whose name and type disagree',
};

export function DataQualityTable({ items, isLoading }: DataQualityTableProps) {
  return (
    <section className="panel" aria-labelledby="dq-h">
      <div className="panel-head">
        <div>
          <h2 className="panel-title" id="dq-h">
            Data quality exceptions
          </h2>
          <p className="hint">
            Checked live against the current ledger. Raw source data files are never overwritten.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          <div className="skel" style={{ height: '36px' }} />
          <div className="skel" style={{ height: '36px' }} />
          <div className="skel" style={{ height: '36px' }} />
        </div>
      ) : items.length > 0 ? (
        <div className="tablewrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col" className="num">
                  Rows
                </th>
                <th scope="col">How it is handled</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => {
                const title = ANOMALY_TITLES[d.anomaly] || d.anomaly.replace(/_/g, ' ');
                const isZero = d.count === 0;
                const badgeClass = isZero ? 'ok' : 'warn';

                return (
                  <tr key={d.anomaly}>
                    <td>
                      <b>{title}</b>
                      {d.description && (
                        <div className="text-[var(--ink-3)] text-xs mt-0.5">
                          {d.description}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <span className={`badge ${badgeClass}`}>
                        {fmtCount(d.count)}
                      </span>
                    </td>
                    <td className="text-[var(--ink-2)] text-sm max-w-md">
                      {d.handling}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty p-6 text-center text-[var(--ink-2)]">
          <p>No data quality anomalies detected across the ledger.</p>
        </div>
      )}
    </section>
  );
}

