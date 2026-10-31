'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import { useImportBatch } from '@/hooks/use-admin';
import { fmtDate, fmtCount } from '@/lib/formatters';
import { BatchRecordsTable } from './batch-records-table';
import type { ImportBatch } from '@finpilot/shared';

interface BatchDetailModalProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: ImportBatch;
}

export function BatchDetailModal({
  batchId,
  open,
  onOpenChange,
  batch: initialBatch,
}: BatchDetailModalProps) {
  // If batch was passed from history card, use it; otherwise fetch summary
  const {
    data,
    isLoading: isBatchLoading,
    isError,
    error,
  } = useImportBatch(!initialBatch && batchId ? batchId : '');

  if (!batchId) return null;

  const batch = initialBatch || data?.batch;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-backdrop" />
        <Dialog.Content
          className="dialog-box"
          style={{ width: 'min(820px, calc(100vw - 32px))' }}
          aria-describedby="batch-desc"
        >
          <div className="p-6 grid gap-4">
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div>
                <Dialog.Title className="h2 flex items-center gap-2">
                  <span>Batch {batchId}</span>
                  {batch?.status && (
                    <span className="badge ok text-xs font-mono">{batch.status}</span>
                  )}
                </Dialog.Title>
                <p id="batch-desc" className="text-[var(--ink-2)] text-sm mt-1">
                  {batch?.fileName ? (
                    <>
                      <span className="font-medium text-[var(--ink)]">{batch.fileName}</span> •
                      Imported by {batch.importedBy} on{' '}
                      {batch.importedAt ? fmtDate(batch.importedAt) : '—'}
                    </>
                  ) : (
                    'Audit records and reconciliation details'
                  )}
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

            {/* Error loading batch metadata */}
            {isError && (
              <div className="errsum flex items-center gap-2 text-xs" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error?.message || 'Failed to load batch summary.'}</span>
              </div>
            )}

            {/* Batch metrics strip */}
            {isBatchLoading && !batch ? (
              <div className="skel" style={{ height: '56px' }} />
            ) : batch ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[var(--surface-sunken)] rounded-md text-sm">
                <div>
                  <span className="text-[var(--ink-2)] block text-xs">Total Ingested</span>
                  <b className="font-mono">{fmtCount(batch.totalRows)}</b>
                </div>
                <div>
                  <span className="text-[var(--ink-2)] block text-xs">Imported (Valid)</span>
                  <b className="text-[var(--gain)] font-mono">{fmtCount(batch.imported)}</b>
                </div>
                <div>
                  <span className="text-[var(--ink-2)] block text-xs">Duplicate (Skipped)</span>
                  <b className="font-mono">{fmtCount(batch.duplicate)}</b>
                </div>
                <div>
                  <span className="text-[var(--ink-2)] block text-xs">Rejected (Quarantined)</span>
                  <b className={batch.rejected > 0 ? 'text-[var(--loss)] font-mono' : 'font-mono'}>
                    {fmtCount(batch.rejected)}
                  </b>
                </div>
              </div>
            ) : null}

            {/* Paginated Quarantined / Audit Records Table */}
            <div className="mt-2">
              <h3 className="font-semibold text-sm mb-2 text-[var(--ink)]">
                Quarantined & Audit Records
              </h3>
              <BatchRecordsTable batchId={batchId} />
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-[var(--line)]">
              <button type="button" className="btn ghost sm" onClick={() => onOpenChange(false)}>
                Close
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
