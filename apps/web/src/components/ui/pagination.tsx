'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fmtCount } from '@/lib/formatters';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  limit?: number;
  pageSizeOptions?: number[];
  isFetching?: boolean;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  limit,
  pageSizeOptions = [20, 50, 100],
  isFetching = false,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const currentSize = pageSize || limit || 100;
  const from = total ? (page - 1) * currentSize + 1 : 0;
  const to = Math.min(total, page * currentSize);

  // Generate page numbers with ellipses
  const pageNumbers: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== 'ellipsis') {
      pageNumbers.push('ellipsis');
    }
  }

  return (
    <nav className="pager" aria-label="Pagination">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-[var(--ink-2)]" id="pagination-summary">
          Showing {fmtCount(from)}–{fmtCount(to)} of {fmtCount(total)}
        </span>
        {isFetching && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-3)] animate-pulse"
            aria-live="polite"
          >
            <Loader2 className="w-3 h-3 animate-spin text-[var(--indigo)]" />
            <span>updating...</span>
          </span>
        )}
      </div>

      <div className="pages">
        <button
          type="button"
          className="pg"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 faint select-none" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={`page-${item}`}
              type="button"
              className="pg"
              disabled={isFetching}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className="pg"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <label className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
        <span>Rows per page</span>
        <select
          className="select !h-[34px] !py-1 !px-2 !w-auto"
          value={currentSize}
          disabled={isFetching}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
