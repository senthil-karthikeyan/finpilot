'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CustomerHeader } from '@/components/customers/customer-header';
import { Pagination } from '@/components/ui/pagination';
import { useCustomer } from '@/hooks/use-portfolio';
import { useCustomerTransactions } from '@/hooks/use-transactions';
import {
  inr,
  fmtDate,
  fmtQty,
  fmtCount,
  sgn,
  pnlClass,
  cap,
} from '@/lib/formatters';
import { ACCOUNT_TYPE_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import type { TransactionType, TransactionStatus } from '@finpilot/shared';

function TransactionsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const id = typeof params?.id === 'string' ? params.id : '';

  // Initial filter values from URL search params
  const initialAccount = searchParams.get('account') || searchParams.get('accountId') || '';
  const initialType = (searchParams.get('type') as TransactionType | null) || '';
  const initialStatus = (searchParams.get('status') as TransactionStatus | null) || '';
  const initialStart = searchParams.get('startDate') || searchParams.get('from') || '';
  const initialEnd = searchParams.get('endDate') || searchParams.get('to') || '';
  const initialSortBy = (searchParams.get('sortBy') as 'tradeDate' | 'amount' | 'transactionType') || 'tradeDate';
  const initialSortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || 20;

  const [accountId, setAccountId] = useState<string>(initialAccount);
  const [transactionType, setTransactionType] = useState<TransactionType | ''>(initialType);
  const [status, setStatus] = useState<TransactionStatus | ''>(initialStatus);
  const [startDate, setStartDate] = useState<string>(initialStart);
  const [endDate, setEndDate] = useState<string>(initialEnd);
  const [sortBy, setSortBy] = useState<'tradeDate' | 'amount' | 'transactionType'>(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  const {
    data: customer,
    isLoading: isCustLoading,
    isError: isCustError,
    error: custError,
    refetch: refetchCust,
  } = useCustomer(id);

  const {
    data: txResponse,
    isLoading: isTxLoading,
    isError: isTxError,
    error: txError,
    refetch: refetchTx,
    isPlaceholderData,
  } = useCustomerTransactions(id, {
    accountId: accountId || undefined,
    transactionType: transactionType || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
    sortBy,
    sortDir,
  });

  const isLoading = isCustLoading || (isTxLoading && !txResponse);
  const isError = isCustError || isTxError;
  const error = custError || txError;

  const customerContext = customer
    ? {
        id: customer.id,
        name: customer.name,
        segment: customer.segment,
        kycStatus: customer.kycStatus,
      }
    : undefined;

  const updateUrl = (
    newAccount: string,
    newType: string,
    newStatus: string,
    newStart: string,
    newEnd: string,
    newSortBy: string,
    newSortDir: string,
    newPage: number,
    newLimit: number,
  ) => {
    const q = new URLSearchParams();
    if (newAccount) q.set('account', newAccount);
    if (newType) q.set('type', newType);
    if (newStatus) q.set('status', newStatus);
    if (newStart) q.set('from', newStart);
    if (newEnd) q.set('to', newEnd);
    if (newSortBy !== 'tradeDate') q.set('sortBy', newSortBy);
    if (newSortDir !== 'desc') q.set('sortDir', newSortDir);
    if (newPage > 1) q.set('page', String(newPage));
    if (newLimit !== 20) q.set('limit', String(newLimit));

    const qs = q.toString();
    const newPath = qs ? `/customers/${id}/transactions?${qs}` : `/customers/${id}/transactions`;

    startTransition(() => {
      router.replace(newPath, { scroll: false });
    });
  };

  const handleSort = (field: 'tradeDate' | 'amount') => {
    let nextDir: 'asc' | 'desc' = 'desc';
    if (sortBy === field) {
      nextDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      nextDir = field === 'tradeDate' ? 'desc' : 'desc';
    }
    setSortBy(field);
    setSortDir(nextDir);
    setPage(1);
    updateUrl(accountId, transactionType, status, startDate, endDate, field, nextDir, 1, limit);
  };

  const resetFilters = () => {
    setAccountId('');
    setTransactionType('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setSortBy('tradeDate');
    setSortDir('desc');
    setPage(1);
    updateUrl('', '', '', '', '', 'tradeDate', 'desc', 1, limit);
  };

  const hasActiveFilters = Boolean(
    accountId || transactionType || status || startDate || endDate,
  );

  return (
    <ProtectedRoute>
      <AppShell customerContext={customerContext}>
        {isLoading && !customer ? (
          <div role="status" aria-label="Loading transactions">
            <div className="skel" style={{ height: '44px', width: 'min(360px, 70%)' }} />
            <div
              className="skel"
              style={{ height: '18px', width: 'min(240px, 50%)', marginTop: '14px' }}
            />
            <div className="skel" style={{ height: '120px', marginTop: '24px' }} />
            <div className="skel" style={{ height: '340px', marginTop: '20px' }} />
          </div>
        ) : isError || !customer ? (
          <div className="empty panel" role="alert">
            <span className="badge bad">ERROR</span>
            <h2 className="h2">Customer not found or failed to load</h2>
            <p>{error?.message || 'Unable to retrieve transactions from the service.'}</p>
            <div className="flex gap-3 flex-wrap justify-center mt-3">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  refetchCust();
                  refetchTx();
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => router.push(`/customers/${id}`)}
              >
                Back to overview
              </button>
            </div>
          </div>
        ) : (
          <>
            <CustomerHeader customer={customer} activeTab="transactions" />

            {/* Filter Bar Panel matching mock */}
            <form
              className="panel panel-body"
              id="tx-filters"
              aria-label="Filter transactions"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="filters">
                <div className="field">
                  <label htmlFor="tx-from">From</label>
                  <input
                    className="input"
                    type="date"
                    id="tx-from"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                      updateUrl(
                        accountId,
                        transactionType,
                        status,
                        e.target.value,
                        endDate,
                        sortBy,
                        sortDir,
                        1,
                        limit,
                      );
                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="tx-to">To</label>
                  <input
                    className="input"
                    type="date"
                    id="tx-to"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                      updateUrl(
                        accountId,
                        transactionType,
                        status,
                        startDate,
                        e.target.value,
                        sortBy,
                        sortDir,
                        1,
                        limit,
                      );
                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="tx-acct">Account</label>
                  <select
                    className="select"
                    id="tx-acct"
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value);
                      setPage(1);
                      updateUrl(
                        e.target.value,
                        transactionType,
                        status,
                        startDate,
                        endDate,
                        sortBy,
                        sortDir,
                        1,
                        limit,
                      );
                    }}
                  >
                    <option value="">All accounts</option>
                    {customer.accounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>
                        {a.accountId},{' '}
                        {ACCOUNT_TYPE_LABELS[a.accountType] || a.accountType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tx-type">Type</label>
                  <select
                    className="select"
                    id="tx-type"
                    value={transactionType}
                    onChange={(e) => {
                      const val = e.target.value as TransactionType | '';
                      setTransactionType(val);
                      setPage(1);
                      updateUrl(
                        accountId,
                        val,
                        status,
                        startDate,
                        endDate,
                        sortBy,
                        sortDir,
                        1,
                        limit,
                      );
                    }}
                  >
                    <option value="">All types</option>
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                    <option value="DIVIDEND">Dividend</option>
                    <option value="FEE">Fee</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tx-status">Status</label>
                  <select
                    className="select"
                    id="tx-status"
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value as TransactionStatus | '';
                      setStatus(val);
                      setPage(1);
                      updateUrl(
                        accountId,
                        transactionType,
                        val,
                        startDate,
                        endDate,
                        sortBy,
                        sortDir,
                        1,
                        limit,
                      );
                    }}
                  >
                    <option value="">All statuses</option>
                    <option value="SETTLED">Settled</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVERSED">Reversed</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={resetFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </form>

            {/* Sub-header info row */}
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              style={{ margin: '18px 0 10px' }}
            >
              <p className="text-[var(--ink-2)]" id="tx-count" aria-live="polite">
                {fmtCount(txResponse?.meta.total ?? 0)} transactions
              </p>
              <p className="hint">
                Pending rows have an amber edge. Reversed rows are struck through and shaded.
              </p>
            </div>

            {/* Transactions Ledger Panel */}
            <div className="panel">
              <div id="tx-region" aria-live="polite" aria-busy={isTxLoading}>
                {isTxLoading && !txResponse ? (
                  <div className="p-5" role="status" aria-label="Loading transactions">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="skel"
                        style={{ height: '22px', margin: '14px 0' }}
                      />
                    ))}
                  </div>
                ) : !txResponse || txResponse.data.length === 0 ? (
                  <div className="empty">
                    <Search className="w-7 h-7 text-[var(--ink-3)]" />
                    <h2 className="h2">No transactions match these filters</h2>
                    <p className="text-[var(--ink-2)]">
                      Widen the date range or clear a filter to see more of this customer&apos;s activity.
                    </p>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="tablewrap"
                      style={{ opacity: isPlaceholderData ? 0.7 : 1 }}
                    >
                      <table className="tbl">
                        <caption className="sr-only">
                          Transactions, page {txResponse.meta.page} of {txResponse.meta.totalPages}
                        </caption>
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              aria-sort={
                                sortBy === 'tradeDate'
                                  ? sortDir === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : 'none'
                              }
                            >
                              <button
                                type="button"
                                className="sortbtn"
                                aria-pressed={sortBy === 'tradeDate'}
                                onClick={() => handleSort('tradeDate')}
                              >
                                <span>Trade date</span>
                                {sortBy === 'tradeDate' && (
                                  sortDir === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  )
                                )}
                              </button>
                            </th>
                            <th scope="col">Transaction</th>
                            <th scope="col">Account</th>
                            <th scope="col">Instrument</th>
                            <th scope="col">Type</th>
                            <th scope="col" className="num">
                              Quantity
                            </th>
                            <th scope="col" className="num">
                              Price
                            </th>
                            <th
                              scope="col"
                              className="num"
                              aria-sort={
                                sortBy === 'amount'
                                  ? sortDir === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : 'none'
                              }
                            >
                              <button
                                type="button"
                                className="sortbtn !justify-end w-full"
                                aria-pressed={sortBy === 'amount'}
                                onClick={() => handleSort('amount')}
                              >
                                <span>Cash effect</span>
                                {sortBy === 'amount' && (
                                  sortDir === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  )
                                )}
                              </button>
                            </th>
                            <th scope="col">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txResponse.data.map((t) => {
                            const isReversed = t.status === 'REVERSED';
                            const isPending = t.status === 'PENDING';
                            const rowClass = isReversed
                              ? 'tx-reversed'
                              : isPending
                                ? 'tx-pending'
                                : t.isFuture
                                  ? 'tx-future'
                                  : '';

                            const isCashIn = t.type === 'SELL' || t.type === 'DIVIDEND';
                            const cashEffect = isCashIn ? t.amount : -t.amount;
                            const typeLabel =
                              TRANSACTION_TYPE_LABELS[t.type] || cap(t.type);

                            const statusClass =
                              t.status === 'SETTLED'
                                ? 'ok'
                                : t.status === 'PENDING'
                                  ? 'warn'
                                  : 'bad';

                            return (
                              <tr
                                key={t.id || t.transactionId}
                                className={rowClass}
                              >
                                <td>{fmtDate(t.tradeDate)}</td>
                                <td>
                                  <code>{t.id || t.transactionId}</code>
                                </td>
                                <td>{t.accountId}</td>
                                <td>
                                  <span className="cell-main">
                                    {t.symbol || '—'}
                                  </span>
                                  {t.instrumentName && (
                                    <span className="cell-sub">
                                      {t.instrumentName}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="inline-flex flex-wrap items-center gap-1.5">
                                    <span>{typeLabel}</span>
                                    {t.isFuture && (
                                      <span
                                        className="badge bad text-[11px] py-0 px-1"
                                        title="Future trade anomaly"
                                      >
                                        Future
                                      </span>
                                    )}
                                    {t.beforeOpenFlag && (
                                      <span
                                        className="badge warn text-[11px] py-0 px-1"
                                        title="Traded before account opened"
                                      >
                                        Pre-open
                                      </span>
                                    )}
                                    {t.onClosedFlag && (
                                      <span
                                        className="badge bad text-[11px] py-0 px-1"
                                        title="Traded on closed account"
                                      >
                                        Closed acct
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="num">
                                  {t.quantity ? fmtQty(t.quantity) : '—'}
                                </td>
                                <td className="num">
                                  {t.price ? inr(t.price) : '—'}
                                </td>
                                <td
                                  className={`num ${
                                    isReversed ? '' : pnlClass(cashEffect)
                                  }`}
                                >
                                  {sgn(cashEffect)}
                                  {inr(Math.abs(cashEffect))}
                                </td>
                                <td className="status-cell">
                                  <span className={`badge ${statusClass}`}>
                                    {cap(t.status)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <Pagination
                      page={txResponse.meta.page}
                      totalPages={txResponse.meta.totalPages}
                      total={txResponse.meta.total}
                      limit={txResponse.meta.limit}
                      onPageChange={(p) => {
                        setPage(p);
                        updateUrl(
                          accountId,
                          transactionType,
                          status,
                          startDate,
                          endDate,
                          sortBy,
                          sortDir,
                          p,
                          limit,
                        );
                      }}
                      onLimitChange={(l) => {
                        setLimit(l);
                        setPage(1);
                        updateUrl(
                          accountId,
                          transactionType,
                          status,
                          startDate,
                          endDate,
                          sortBy,
                          sortDir,
                          1,
                          l,
                        );
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function CustomerTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading transactions">
          <div className="skel" style={{ height: '44px', width: '360px' }} />
          <div
            className="skel"
            style={{ height: '18px', width: '240px', marginTop: '14px' }}
          />
          <div className="skel" style={{ height: '340px', marginTop: '34px' }} />
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
