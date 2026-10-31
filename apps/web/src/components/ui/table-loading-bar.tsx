'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface TableLoadingBarProps {
  isFetching: boolean;
  message?: string;
  showBadge?: boolean;
}

export function TableLoadingBar({
  isFetching,
  message = 'Updating results...',
  showBadge = false,
}: TableLoadingBarProps) {
  if (!isFetching) return null;

  return (
    <>
      {/* Indeterminate linear loading bar along top border */}
      <div
        className="progress-bar-indeterminate"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <span className="sr-only">{message}</span>
      </div>

      {/* Optional subtle floating pill indicator */}
      {showBadge && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--indigo)] border border-[var(--indigo-wash)] shadow-xs">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
            <span>{message}</span>
          </span>
        </div>
      )}
    </>
  );
}

