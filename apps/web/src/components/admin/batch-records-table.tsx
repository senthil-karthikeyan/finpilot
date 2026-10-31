'use client';

import React, { useState } from 'react';
import { Download, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useRejectedRows } from '@/hooks/use-admin';
import { Pagination } from '@/components/ui/pagination';
import { TableLoadingBar } from '@/components/ui/table-loading-bar';
import { fmtCount } from '@/lib/formatters';

interface BatchRecordsTableProps {
  batchId: string;
  initialPageSize?: number;
}

export function BatchRecordsTable({
  batchId,
  initialPageSize = 20,
}: BatchRecordsTableProps) {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [outcome, setOutcome] = useState<'all' | 'rejected' | 'duplicate'>('all');

  const { data, isLoading, isError, error, refetch, isFetching } = useRejectedRows(
    batchId,
    page,
    pageSize,
    outcome,
  );

  const rows = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  };

  const getOutcomeBadge = (rowOutcome: string) => {
    switch (rowOutcome) {
      case 'rejected':
        return <span className="badge bad">Rejected</span>;
      case 'duplicate':
        return <span className="badge">Duplicate</span>;
      case 'future_dated':
        return <span className="badge warn">Future dated</span>;
      case 'imported':
        return <span className="badge ok">Imported</span>;
      default:
        return <span className="badge">{rowOutcome}</span>;
    }
  };

  const handleOutcomeChange = (newOutcome: 'all' | 'rejected' | 'duplicate') => {
    setOutcome(newOutcome);
    setPage(1);
  };

  return (
    <div className="space-y-3" data-testid="batch-records-section">
      {/* Table controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <label htmlFor={`batch-filter-${batchId}`} className="text-xs font-medium text-[var(--ink-2)]">
            Outcome:
          </label>
          <select
            id={`batch-filter-${batchId}`}
            className="select text-xs py-1 px-2.5 !h-[32px] w-auto"
            value={outcome}
            disabled={isFetching}
            onChange={(e) =>
              handleOutcomeChange(e.target.value as 'all' | 'rejected' | 'duplicate')
            }
            aria-label="Filter records by outcome"
          >
            <option value="all">All Quarantined ({meta.total ? fmtCount(meta.total) : '0'})</option>
            <option value="rejected">Rejected Only</option>
            <option value="duplicate">Duplicates Only</option>
          </select>

          {isFetching && !isLoading && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-[var(--indigo)] bg-[var(--indigo-wash)] animate-pulse"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
              <span>
                {outcome === 'all'
                  ? 'Updating records...'
                  : `Filtering by ${outcome}...`}
              </span>
            </span>
          )}
        </div>

        <a
          href={`/api/v1/admin/imports/${encodeURIComponent(batchId)}/rejected/csv`}
          download={`rejected_rows_${batchId}.csv`}
          className="btn ghost sm inline-flex items-center gap-1.5 text-xs !h-[32px] px-3 font-medium"
          title="Download full CSV of quarantined audit rows"
          data-testid="download-rejected-csv-link"
        >
          <Download className="w-3.5 h-3.5 text-[var(--ink-2)]" />
          Export CSV
        </a>
      </div>

      {/* Error state */}
      {isError && (
        <div className="errsum flex items-center justify-between gap-2 p-3 text-xs" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--loss)]" />
            <span>{error?.message || 'Failed to load quarantined audit records.'}</span>
          </div>
          <button
            type="button"
            className="btn ghost sm text-xs !h-[28px]"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton state */}
      {isLoading ? (
        <div className="tablewrap border border-[var(--line)] rounded overflow-hidden" role="status" aria-label="Loading quarantined records">
          <div className="p-4 space-y-2.5">
            <div className="skel" style={{ height: '32px' }} />
            <div className="skel" style={{ height: '36px' }} />
            <div className="skel" style={{ height: '36px' }} />
            <div className="skel" style={{ height: '36px' }} />
          </div>
        </div>
      ) : rows.length > 0 ? (
        /* Paginated records table */
        <div
          className="tablewrap relative border border-[var(--line)] rounded overflow-hidden"
          style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 0.15s ease' }}
          aria-busy={isLoading || isFetching}
        >
          <TableLoadingBar isFetching={isFetching} message="Updating quarantined records..." />
          <table className="tbl text-xs" data-testid="batch-records-table">
            <thead>
              <tr>
                <th scope="col" className="num w-16">
                  Line
                </th>
                <th scope="col" className="w-44">
                  Transaction ID
                </th>
                <th scope="col" className="w-28">
                  Outcome
                </th>
                <th scope="col">
                  Validation Reason / Error
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.rowNumber}-${r.transactionId || 'none'}-${i}`}>
                  <td className="num font-mono">{r.rowNumber ?? r.lineNumber}</td>
                  <td>
                    {r.transactionId ? (
                      <code className="text-xs">{r.transactionId}</code>
                    ) : (
                      <span className="text-[var(--ink-3)] italic">Not provided</span>
                    )}
                  </td>
                  <td>{getOutcomeBadge(r.outcome)}</td>
                  <td className="text-[var(--ink-2)] max-w-[340px] truncate" title={r.reason || r.errorMessage || ''}>
                    {r.reason || r.errorMessage || r.errorCode || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty state */
        <div className="empty border border-[var(--line)] rounded py-8 text-center text-xs text-[var(--ink-2)]">
          <FileText className="w-6 h-6 mx-auto mb-2 text-[var(--ink-3)] opacity-60" />
          <p className="font-medium text-[var(--ink)]">No quarantined records found</p>
          <p className="text-[11px] mt-0.5 text-[var(--ink-2)]">
            {outcome === 'all'
              ? 'All rows in this batch were imported successfully.'
              : `No rows with outcome "${outcome}" found in this batch.`}
          </p>
        </div>
      )}

      {/* Server-side Pagination controls */}
      {meta.total > 0 && (
        <div className="pt-1" data-testid="batch-records-pagination">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={meta.pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            isFetching={isFetching}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setPageSize(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
