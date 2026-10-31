'use client';

import React, { useState, Suspense } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ImportDropzone } from '@/components/admin/import-dropzone';
import { ImportStepper } from '@/components/admin/import-stepper';
import { ImportResults } from '@/components/admin/import-results';
import { ImportHistoryCard } from '@/components/admin/import-history-card';
import { DataQualityTable } from '@/components/admin/data-quality-table';
import {
  useImportBatches,
  useDataQuality,
  useUploadTransactionsCsv,
} from '@/hooks/use-admin';
import { fmtCount } from '@/lib/formatters';
import type { ImportResponse } from '@finpilot/shared';

function AdminImportsContent() {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: batches = [],
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
  } = useImportBatches();

  const {
    data: dqResponse,
    isLoading: isDqLoading,
    refetch: refetchDq,
  } = useDataQuality();

  const uploadMutation = useUploadTransactionsCsv();

  const handleStartImport = async () => {
    if (!selectedFile) return;

    setPhase('running');
    setErrorMessage(null);
    setCurrentStep(0);

    // Progressive visual stepper simulation for realistic operations feel
    const stepTimer1 = setTimeout(() => setCurrentStep(1), 300);
    const stepTimer2 = setTimeout(() => setCurrentStep(2), 700);
    const stepTimer3 = setTimeout(() => setCurrentStep(3), 1100);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await uploadMutation.mutateAsync(formData);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setCurrentStep(4);

      setImportResult(res);
      setPhase('done');
      toast.success(
        `Import complete: ${fmtCount(res.imported ?? res.importedCount ?? 0)} transactions loaded`,
      );

      refetchBatches();
      refetchDq();
    } catch (err: unknown) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setPhase('idle');
      const errObj = err as { message?: string };
      const msg = errObj.message || 'Import failed. No changes were made to the ledger.';
      setErrorMessage(msg);
      toast.error('Import failed. Nothing was changed.');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setSelectedFile(null);
    setImportResult(null);
    setErrorMessage(null);
    setCurrentStep(0);
  };

  const totalLedgerTransactions = batches.reduce(
    (acc, b) => acc + (b.imported ?? b.importedCount ?? 0),
    0,
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AppShell>
        <header className="page-head">
          <div>
            <h1 className="h1">Data import</h1>
            <p className="sub">
              Load transactions from a CSV. Rows are staged and checked first; only valid rows reach
              the ledger, all in one transaction.
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Informational banner with current ledger totals */}
          <div className="banner info flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span id="ledger-note">
              The ledger currently tracks{' '}
              <b>{fmtCount(totalLedgerTransactions)}</b> transactions across{' '}
              <b>{batches.length}</b> historical ingestion batches.
            </span>
          </div>

          {/* Import Interactive Area */}
          <div id="import-body">
            {phase === 'idle' && (
              <ImportDropzone
                selectedFile={selectedFile}
                onFileSelect={(f) => {
                  setSelectedFile(f);
                  setErrorMessage(null);
                }}
                onClearFile={() => setSelectedFile(null)}
                onStartImport={handleStartImport}
                error={errorMessage}
              />
            )}

            {phase === 'running' && selectedFile && (
              <ImportStepper
                fileName={selectedFile.name}
                currentStep={currentStep}
              />
            )}

            {phase === 'done' && importResult && (
              <ImportResults
                result={importResult}
                onReset={handleReset}
              />
            )}
          </div>

          {/* Two-column overview grid */}
          <div className="grid two gap-6">
            <section className="panel" aria-labelledby="rules-h">
              <div className="panel-head">
                <h2 className="panel-title" id="rules-h">
                  How each row is handled
                </h2>
              </div>
              <div className="tablewrap" style={{ marginTop: '8px' }}>
                <table className="tbl">
                  <tbody>
                    <tr>
                      <td>
                        <b>Same ID, same values</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Skipped as a duplicate. Safe to re-upload.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Same ID, different values</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Rejected. Imports never overwrite existing data.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Unknown account or instrument</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Rejected with foreign-key validation error.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Negative amount</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Rejected. Direction is derived strictly from transaction type.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Future trade date</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Quarantined with is_future=true; excluded from balances.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Bad date, number, or enum</b>
                      </td>
                      <td className="text-[var(--ink-2)]">
                        Rejected with line number and specific reason.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <ImportHistoryCard
              batches={batches}
              isLoading={isBatchesLoading}
            />
          </div>

          {/* Data quality exceptions panel */}
          <DataQualityTable
            items={dqResponse?.items || []}
            isLoading={isDqLoading}
          />
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function AdminImportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading data import">
          <div className="skel" style={{ height: '40px', width: '300px' }} />
          <div className="skel" style={{ height: '18px', width: '240px', marginTop: '12px' }} />
          <div className="skel" style={{ height: '340px', marginTop: '28px' }} />
        </div>
      }
    >
      <AdminImportsContent />
    </Suspense>
  );
}

