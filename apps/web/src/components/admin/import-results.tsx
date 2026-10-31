'use client';

import React, { useState } from 'react';
import { Download, Info, CheckCircle2 } from 'lucide-react';
import { fmtCount } from '@/lib/formatters';
import type { ImportResponse, ImportRowResult } from '@finpilot/shared';

interface ImportResultsProps {
  result: ImportResponse;
  onReset: () => void;
}

export function ImportResults({ result, onReset }: ImportResultsProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<
    'attention' | 'all' | 'rejected' | 'duplicate' | 'future_dated'
  >('attention');

  const batchId = result.batchId;
  const fileName = result.fileName || result.filename || 'transactions.csv';
  const totalRows = result.totalRows ?? result.rowCount ?? 0;
  const imported = result.imported ?? result.importedCount ?? 0;
  const duplicates = result.duplicate ?? result.duplicateCount ?? 0;
  const rejected = result.rejected ?? result.rejectedCount ?? 0;
  const futureDated = result.futureDated ?? result.futureDatedCount ?? 0;
  const durationMs = result.durationMs ?? 0;

  const rows: ImportRowResult[] = result.rows || [];

  const attentionRows = rows.filter((r) => r.outcome !== 'duplicate');

  const filteredRows = rows.filter((r) => {
    if (outcomeFilter === 'all') return true;
    if (outcomeFilter === 'attention') return r.outcome !== 'duplicate';
    return r.outcome === outcomeFilter;
  });

  const handleDownloadCsv = () => {
    const exportData = outcomeFilter === 'attention' ? attentionRows : filteredRows;
    const header = 'file_line,transaction_id,outcome,error_code,message';
    const lines = exportData.map((r) => {
      const line = r.rowNumber ?? r.lineNumber ?? '';
      const tx = r.transactionId ?? '';
      const outcome = r.outcome ?? '';
      const code = r.errorCode ?? '';
      const msg = (r.errorMessage || r.reason || '').replace(/"/g, '""');
      return `${line},${tx},${outcome},${code},"${msg}"`;
    });

    const csvContent = [header, ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batchId}-reconciliation-issues.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
    <section aria-labelledby="res-h" className="space-y-4">
      {/* Head */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--gain)]" />
            <h2 className="h2" id="res-h">
              Import {batchId} finished
            </h2>
          </div>
          <p className="text-[var(--ink-2)] text-sm mt-1">
            {fileName}, {fmtCount(totalRows)} rows processed in {durationMs} ms.
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={onReset}
          data-action="reset-import"
        >
          Import another file
        </button>
      </div>

      {/* Outcomes Strip */}
      <div className="outcomes">
        <div>
          <b className="up">{fmtCount(imported)}</b>
          <span>Imported</span>
        </div>
        <div>
          <b>{fmtCount(duplicates)}</b>
          <span>Duplicates skipped</span>
        </div>
        <div>
          <b className={rejected > 0 ? 'down' : ''}>{fmtCount(rejected)}</b>
          <span>Rejected</span>
        </div>
        <div>
          <b>{fmtCount(futureDated)}</b>
          <span>Future dated</span>
        </div>
      </div>

      {/* Idempotency Safe Banner */}
      {imported === 0 && rejected === 0 && futureDated === 0 && (
        <div className="banner info flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Nothing new to load. Every row was already in the ledger, which makes re-uploading the same file safe.
          </span>
        </div>
      )}

      {/* Non-imported / Flagged rows inspection panel */}
      <div className="panel">
        <div className="panel-head flex flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <h3 className="panel-title">Row-level reconciliation</h3>
            <p className="hint">
              {fmtCount(attentionRows.length)} need attention
              {duplicates > 0 ? `, plus ${fmtCount(duplicates)} harmless duplicates` : ''}.
              Line numbers correspond directly to your uploaded CSV.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <label className="sr-only" htmlFor="imp-filter">
              Filter by outcome
            </label>
            <select
              id="imp-filter"
              className="select w-auto"
              value={outcomeFilter}
              onChange={(e) =>
                setOutcomeFilter(
                  e.target.value as 'attention' | 'all' | 'rejected' | 'duplicate' | 'future_dated',
                )
              }
            >
              <option value="attention">Needs attention ({attentionRows.length})</option>
              <option value="all">Everything ({rows.length})</option>
              <option value="rejected">Rejected ({rejected})</option>
              <option value="duplicate">Duplicates ({duplicates})</option>
              <option value="future_dated">Future dated ({futureDated})</option>
            </select>

            <button
              type="button"
              className="btn ghost sm"
              onClick={handleDownloadCsv}
              disabled={filteredRows.length === 0}
              data-action="download-rejects"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Download CSV
            </button>
          </div>
        </div>

        {filteredRows.length > 0 ? (
          <div className="tablewrap">
            <table className="tbl">
              <caption className="sr-only">Reconciled transaction rows</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">
                    File line
                  </th>
                  <th scope="col">Transaction ID</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Error Code</th>
                  <th scope="col">What happened</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 150).map((r, i) => {
                  const line = r.rowNumber ?? r.lineNumber ?? i + 1;
                  const txId = r.transactionId || '(blank)';
                  const isFuture = r.outcome === 'future_dated';

                  return (
                    <tr key={`${line}-${txId}-${i}`} className={isFuture ? 'tx-quarantine' : ''}>
                      <td className="num">{line}</td>
                      <td>
                        <code>{txId}</code>
                      </td>
                      <td>{getOutcomeBadge(r.outcome)}</td>
                      <td>
                        {r.errorCode ? <code>{r.errorCode}</code> : '-'}
                      </td>
                      <td className="text-[var(--ink-2)] text-sm">
                        {r.errorMessage || r.reason || 'Processed'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty py-8 text-center text-[var(--ink-2)]">
            <p>
              {rows.length
                ? 'No rows match this outcome filter.'
                : 'Every row passed validation and was loaded into the ledger.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

