'use client';

import React, { Suspense } from 'react';
import { ShieldCheck, Clock, RefreshCw } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DataQualityTable } from '@/components/admin/data-quality-table';
import { useDataQuality } from '@/hooks/use-admin';
import { fmtCount, fmtDate } from '@/lib/formatters';

function DataQualityContent() {
  const { data: dqResponse, isLoading, isError, error, refetch, isFetching } = useDataQuality();

  const items = dqResponse?.items || [];
  const totalAnomalies = items.reduce((acc, item) => acc + (item.count || 0), 0);

  const futureDatedCount =
    items.find((i) => i.anomaly === 'future_dated' || i.anomaly === 'QUARANTINE')?.count || 0;

  const outOfBoundsCount =
    (items.find((i) => i.anomaly === 'before_open_date' || i.anomaly === 'TXN_BEFORE_OPEN')?.count || 0) +
    (items.find((i) => i.anomaly === 'on_closed_account' || i.anomaly === 'TXN_CLOSED_ACCT')?.count || 0);

  const rejectedCount =
    (items.find((i) => i.anomaly === 'duplicate_transactions')?.count || 0) +
    (items.find((i) => i.anomaly === 'invalid_references')?.count || 0);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AppShell>
        <header className="page-head flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="h1">Data Quality</h1>
            <p className="sub">
              Anomaly metrics, validation rules, and system reconciliation status across all customer
              holdings and transactions.
            </p>
          </div>
          <button
            type="button"
            className="btn ghost sm inline-flex items-center gap-1.5"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh status
          </button>
        </header>

        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="summary-line panel panel-body">
            <div>
              <b className={totalAnomalies > 0 ? 'down' : ''}>{fmtCount(totalAnomalies)}</b>
              <span>total anomalies</span>
            </div>
            <div>
              <b>{fmtCount(futureDatedCount)}</b>
              <span>future dated</span>
            </div>
            <div>
              <b>{fmtCount(outOfBoundsCount)}</b>
              <span>out-of-bounds dates</span>
            </div>
            <div>
              <b>{fmtCount(rejectedCount)}</b>
              <span>quarantined / duplicate</span>
            </div>
          </div>

          {/* Anomaly exceptions table */}
          {isError ? (
            <div className="panel panel-body text-center py-8">
              <p className="text-[var(--loss)] font-semibold mb-2">
                {error?.message || 'Failed to load data quality exceptions.'}
              </p>
              <button
                type="button"
                className="btn ghost sm mt-2"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          ) : (
            <DataQualityTable items={items} isLoading={isLoading} isFetching={isFetching} />
          )}

          {/* Architecture & Rules reference */}
          <div className="grid two gap-6">
            <section className="panel" aria-labelledby="arch-h">
              <div className="panel-head">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--indigo)]" />
                  <h2 className="panel-title" id="arch-h">
                    Reconciliation Architecture
                  </h2>
                </div>
              </div>
              <div className="panel-body text-sm space-y-3 text-[var(--ink-2)]">
                <p>
                  FinPilot maintains an <b>immutable ledger</b>. Raw source data files and historical
                  records are never silently altered or deleted.
                </p>
                <p>
                  When anomalous rows are encountered during CSV ingestion, they are either isolated
                  into the <code>import_rows</code> audit quarantine table or flagged directly in the
                  transaction row (such as <code>is_future=true</code> or <code>before_open_flag=true</code>).
                </p>
                <p>
                  Calculated portfolio valuations and cash flow aggregates dynamically respect these
                  flags to safeguard reporting integrity.
                </p>
              </div>
            </section>

            <section className="panel" aria-labelledby="audit-h">
              <div className="panel-head">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--ink-2)]" />
                  <h2 className="panel-title" id="audit-h">
                    Audit Verification Status
                  </h2>
                </div>
              </div>
              <div className="panel-body text-sm space-y-2.5 text-[var(--ink-2)]">
                <div className="flex justify-between py-1 border-b border-[var(--line-soft)]">
                  <span>Engine status</span>
                  <span className="badge ok">Operational</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line-soft)]">
                  <span>Last generated</span>
                  <b>{dqResponse?.generatedAt ? fmtDate(dqResponse.generatedAt) : 'Live'}</b>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line-soft)]">
                  <span>Holdings deduping</span>
                  <span>Collapsed on unique key</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Zero-balance cashflows</span>
                  <span>Excluded from active IRR</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function AdminDataQualityPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading data quality status">
          <div className="skel" style={{ height: '40px', width: '280px' }} />
          <div className="skel" style={{ height: '18px', width: '220px', marginTop: '12px' }} />
          <div className="skel" style={{ height: '340px', marginTop: '28px' }} />
        </div>
      }
    >
      <DataQualityContent />
    </Suspense>
  );
}
