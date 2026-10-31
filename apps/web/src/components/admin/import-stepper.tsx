'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ImportStepperProps {
  fileName: string;
  currentStep: number;
}

const IMPORT_STEPS = [
  'Read the file',
  'Stage rows in a temporary table',
  'Validate every row',
  'Merge valid rows in one transaction',
];

export function ImportStepper({ fileName, currentStep }: ImportStepperProps) {
  return (
    <section className="panel panel-body" aria-live="polite">
      <h2 className="panel-title" style={{ marginBottom: '6px' }}>
        Importing {fileName}
      </h2>
      <p className="text-[var(--ink-2)] text-sm mb-4">
        Transaction reconciliation in progress. Anomaly rules and foreign keys are being verified.
      </p>

      <div className="stepper">
        {IMPORT_STEPS.map((stepTitle, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div
              key={stepTitle}
              className={`step ${isDone ? 'done' : isActive ? 'active' : ''}`}
            >
              <span className="mk">
                {isDone ? <Check className="w-3 h-3 text-white" /> : null}
              </span>
              <span>{stepTitle}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

