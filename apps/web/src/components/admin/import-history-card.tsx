'use client';

import React, { useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { fmtCount } from '@/lib/formatters';
import { BatchDetailModal } from './batch-detail-modal';
import { TableLoadingBar } from '@/components/ui/table-loading-bar';
import type { ImportBatch } from '@finpilot/shared';

interface ImportHistoryCardProps {
  batches: ImportBatch[];
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function ImportHistoryCard({
  batches,
  isLoading,
  isFetching = false,
  onRefresh,
}: ImportHistoryCardProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  return (
    <>
      <section className="panel" aria-labelledby="hist-h">
        <div className="panel-head flex items-center justify-between">
          <h2 className="panel-title" id="hist-h">
            Past imports
          </h2>
          {onRefresh && (
            <button
              type="button"
              className="btn ghost sm inline-flex items-center gap-1.5 text-xs !h-[28px] !px-2.5"
              onClick={onRefresh}
              disabled={isFetching}
              title="Refresh past imports history"
              aria-label="Refresh past imports history"
            >
              <RefreshCw
                className={`w-3 h-3 ${isFetching ? 'animate-spin text-[var(--indigo)]' : ''}`}
              />
              <span>{isFetching ? 'Updating...' : 'Refresh'}</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3" role="status" aria-label="Loading past imports">
            <div className="skel" style={{ height: '36px' }} />
            <div className="skel" style={{ height: '36px' }} />
            <div className="skel" style={{ height: '36px' }} />
          </div>
        ) : batches.length > 0 ? (
          <div
            className="tablewrap relative"
            style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 0.15s ease' }}
            aria-busy={isLoading || isFetching}
          >
            <TableLoadingBar isFetching={isFetching} message="Updating import history..." />
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Batch</th>
                  <th scope="col">File</th>
                  <th scope="col" className="num">
                    Imported
                  </th>
                  <th scope="col" className="num">
                    Skipped
                  </th>
                  <th scope="col" className="num">
                    Rejected
                  </th>
                  <th scope="col" className="text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const imported = b.imported;
                  const skipped = b.duplicate;
                  const rejected = b.rejected + (b.futureDated ?? 0);

                  return (
                    <tr key={b.batchId}>
                      <td>
                        <code>{b.batchId}</code>
                      </td>
                      <td className="text-[var(--ink-2)] max-w-[180px] truncate">
                        {b.fileName}
                      </td>
                      <td className="num font-semibold text-[var(--gain)]">
                        {fmtCount(imported)}
                      </td>
                      <td className="num text-[var(--ink-2)]">
                        {fmtCount(skipped)}
                      </td>
                      <td className={`num ${rejected > 0 ? 'text-[var(--loss)] font-semibold' : ''}`}>
                        {fmtCount(rejected)}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn ghost sm inline-flex items-center gap-1 text-xs"
                          onClick={() => setSelectedBatchId(b.batchId)}
                          aria-label={`Inspect batch ${b.batchId}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty p-6 text-center text-[var(--ink-2)]">
            <p>No imports yet recorded.</p>
          </div>
        )}
      </section>

      {/* Modal to inspect batch rows */}
      <BatchDetailModal
        batchId={selectedBatchId}
        batch={batches.find((b) => b.batchId === selectedBatchId)}
        open={Boolean(selectedBatchId)}
        onOpenChange={(open) => {
          if (!open) setSelectedBatchId(null);
        }}
      />
    </>
  );
}
