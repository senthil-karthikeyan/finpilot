'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import { useImportBatch } from '@/hooks/use-admin';
import { fmtDate, fmtCount } from '@/lib/formatters';

interface BatchDetailModalProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchDetailModal({
  batchId,
  open,
  onOpenChange,
}: BatchDetailModalProps) {
  const { data, isLoading, isError, error } = useImportBatch(batchId || '');
  const [filter, setFilter] = useState<'all' | 'rejected' | 'duplicate' | 'future_dated'>('all');

  if (!batchId) return null;

  const batch = data?.batch;
  const rows = data?.rows || [];

  const filteredRows = rows.filter((r) => {
    if (filter === 'all') return true;
    return r.outcome === filter;
  });

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'rejected':
        return <span className="badge bad">Rejected</span>;
      case 'duplicate':
        return <span className="badge">Duplicate</span>;
      case 'future_dated':
        return <span className="badge warn">Future dated</span>;
      case 'imported':
        return <span className="badge ok">Imported</span>;
      default:
        return <span className="badge">{outcome}</span>;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content
          className="dialog-box"
          style={{ width: 'min(780px, calc(100vw - 32px))' }}
          aria-describedby="batch-desc"
        >
          <div className="p-6 grid gap-4">
            <div className="flex justify-between items-start">
              <div>
                <Dialog.Title className="h2">
                  Batch {batchId}
                </Dialog.Title>
                <p id="batch-desc" className="text-[var(--ink-2)] text-sm mt-1">
                  {batch?.fileName || batch?.filename} • Imported by {batch?.importedBy} on{' '}
                  {fmtDate(batch?.importedAt || batch?.receivedAt)}
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1 rounded transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-6">
                <div className="skel" style={{ height: '32px' }} />
                <div className="skel" style={{ height: '48px' }} />
                <div className="skel" style={{ height: '140px' }} />
              </div>
            ) : isError ? (
              <div className="errsum flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error?.message || 'Failed to load batch audit logs.'}</span>
              </div>
            ) : (
              <>
                {/* Batch metrics strip */}
                {batch && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[var(--surface-sunken)] rounded-md text-sm">
                    <div>
                      <span className="text-[var(--ink-2)] block text-xs">Total</span>
                      <b>{fmtCount(batch.totalRows ?? batch.rowCount ?? 0)}</b>
                    </div>
                    <div>
                      <span className="text-[var(--ink-2)] block text-xs">Imported</span>
                      <b className="text-[var(--gain)]">
                        {fmtCount(batch.imported ?? batch.importedCount ?? 0)}
                      </b>
                    </div>
                    <div>
                      <span className="text-[var(--ink-2)] block text-xs">Duplicates</span>
                      <b>{fmtCount(batch.duplicate ?? batch.duplicateCount ?? 0)}</b>
                    </div>
                    <div>
                      <span className="text-[var(--ink-2)] block text-xs">Rejected</span>
                      <b className={(batch.rejected ?? 0) > 0 ? 'text-[var(--loss)]' : ''}>
                        {fmtCount(batch.rejected ?? batch.rejectedCount ?? 0)}
                      </b>
                    </div>
                  </div>
                )}

                {/* Rows filter */}
                <div className="flex justify-between items-center mt-2">
                  <h3 className="font-semibold text-sm">Quarantined / Audit Rows</h3>
                  <div className="flex items-center gap-2">
                    <label htmlFor="modal-filter" className="sr-only">
                      Filter outcome
                    </label>
                    <select
                      id="modal-filter"
                      className="select w-auto text-xs py-1"
                      value={filter}
                      onChange={(e) =>
                        setFilter(
                          e.target.value as 'all' | 'rejected' | 'duplicate' | 'future_dated',
                        )
                      }
                    >
                      <option value="all">All ({rows.length})</option>
                      <option value="rejected">Rejected</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="future_dated">Future dated</option>
                    </select>
                  </div>
                </div>

                {/* Audit table */}
                {filteredRows.length > 0 ? (
                  <div className="tablewrap max-h-72 overflow-y-auto border border-[var(--line)] rounded">
                    <table className="tbl text-xs">
                      <thead>
                        <tr>
                          <th scope="col" className="num">Line</th>
                          <th scope="col">Transaction</th>
                          <th scope="col">Outcome</th>
                          <th scope="col">Error / Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r, i) => (
                          <tr key={`${r.rowNumber}-${r.transactionId}-${i}`}>
                            <td className="num">{r.rowNumber ?? r.lineNumber}</td>
                            <td><code>{r.transactionId || '-'}</code></td>
                            <td>{getOutcomeBadge(r.outcome)}</td>
                            <td className="text-[var(--ink-2)]">
                              {r.errorMessage || r.reason || r.errorCode || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty py-6 text-center text-xs text-[var(--ink-2)]">
                    No rows logged in this category.
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

