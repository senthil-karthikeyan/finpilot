'use client';

import React, { useRef, useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { formatBytes } from '@/lib/formatters';

export const SAMPLE_BAD_CSV = `transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,status
T0009001,A00001,I0001,BUY,2026-08-14,10,100,1000,SETTLED
T0009002,A00001,I0001,BUY,2026-13-45,10,100,1000,SETTLED
T0009003,A00001,I0001,TRANSFER,2026-08-14,10,100,1000,SETTLED
T0009004,A99999,I0001,BUY,2026-08-14,10,100,1000,SETTLED
T0009005,A00001,I0001,BUY,2026-08-14,ten,100,1000,SETTLED
T0009006,A00001,I0001,FEE,2026-08-14,0,0,-20,SETTLED
T0009001,A00001,I0001,BUY,2026-08-14,10,100,1000,SETTLED
bad-id,A00001,I0001,BUY,2026-08-14,10,100,1000,SETTLED`;

export const SAMPLE_VALID_CSV = `transaction_id,account_id,instrument_id,transaction_type,trade_date,quantity,price,amount,status
T0008001,A00001,I0001,BUY,2026-08-14,10,100,1000,SETTLED
T0008002,A00002,I0002,SELL,2026-08-15,5,200,1000,SETTLED
T0008003,A00003,I0003,BUY,2026-08-16,2,500,1000,SETTLED
T0008004,A00001,I0001,DIVIDEND,2026-08-17,0,0,150,SETTLED
T0008005,A00002,I0002,FEE,2026-08-18,0,0,25,SETTLED`;

interface ImportDropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  onStartImport: () => void;
  error?: string | null;
}

export function ImportDropzone({
  selectedFile,
  onFileSelect,
  onClearFile,
  onStartImport,
  error,
}: ImportDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file && (file.name.endsWith('.csv') || file.type.includes('csv'))) {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        onFileSelect(file);
      }
    }
  };

  const loadSampleValid = () => {
    const blob = new Blob([SAMPLE_VALID_CSV], { type: 'text/csv' });
    const file = new File([blob], 'transactions_sample_valid.csv', {
      type: 'text/csv',
    });
    onFileSelect(file);
  };

  const loadSampleBad = () => {
    const blob = new Blob([SAMPLE_BAD_CSV], { type: 'text/csv' });
    const file = new File([blob], 'transactions_sample_with_mistakes.csv', {
      type: 'text/csv',
    });
    onFileSelect(file);
  };

  return (
    <section className="panel panel-body" aria-labelledby="up-h">
      <h2 className="panel-title" id="up-h" style={{ marginBottom: '12px' }}>
        1. Choose a transactions file
      </h2>

      <div
        className={`drop ${isDragOver ? 'over' : ''}`}
        id="drop"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div>
          <Upload className="w-7 h-7 text-[var(--ink-2)]" />
        </div>

        {selectedFile ? (
          <div>
            <b>{selectedFile.name}</b>
            <br />
            <span className="text-[var(--ink-2)] text-sm">
              {formatBytes(selectedFile.size)} ready to stage and validate
            </span>
          </div>
        ) : (
          <div>
            <b>Drop a CSV here</b>
            <br />
            <span className="text-[var(--ink-2)] text-sm">
              or choose one from your computer
            </span>
          </div>
        )}

        {selectedFile ? (
          <div className="flex gap-2 flex-wrap justify-center mt-2">
            <button
              type="button"
              className="btn"
              onClick={onStartImport}
              data-action="run-import"
            >
              Validate and import
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                onClearFile();
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              data-action="pick-file"
            >
              Choose a different file
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            data-action="pick-file"
          >
            Choose CSV file
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-label="CSV file"
          onChange={handleInputChange}
        />
      </div>

      {!selectedFile && (
        <p className="text-[var(--ink-2)] text-xs mt-3">
          No file handy?{' '}
          <button
            type="button"
            className="linkbtn"
            onClick={loadSampleValid}
            data-action="use-sample"
          >
            Use a valid sample transactions.csv
          </button>{' '}
          or{' '}
          <button
            type="button"
            className="linkbtn"
            onClick={loadSampleBad}
            data-action="use-bad-sample"
          >
            try a small file with mistakes
          </button>
          .
        </p>
      )}

      {error && (
        <div
          className="banner bad flex items-center gap-2 mt-3"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

