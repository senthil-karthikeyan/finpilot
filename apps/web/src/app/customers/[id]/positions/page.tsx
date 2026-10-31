'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Info, RefreshCw, Loader2 } from 'lucide-react';
import { TableLoadingBar } from '@/components/ui/table-loading-bar';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CustomerHeader } from '@/components/customers/customer-header';
import { useCustomer, useCustomerPortfolio } from '@/hooks/use-portfolio';
import {
  inr,
  inr0,
  fmtDate,
  fmtQty,
  pct,
  sgn,
  pnlClass,
  cap,
} from '@/lib/formatters';
import { ASSET_META, ACCOUNT_TYPE_LABELS } from '@/lib/constants';

function PositionsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = typeof params?.id === 'string' ? params.id : '';
  const selectedAccount = searchParams.get('account') || '';

  const {
    data: customer,
    isLoading: isCustLoading,
    isError: isCustError,
    error: custError,
    refetch: refetchCust,
  } = useCustomer(id);

  const {
    data: portfolio,
    isLoading: isPortLoading,
    isError: isPortError,
    error: portError,
    refetch: refetchPort,
    isFetching: isPortFetching,
  } = useCustomerPortfolio(id);

  const isLoading = isCustLoading || isPortLoading;
  const isError = isCustError || isPortError;
  const error = custError || portError;

  const customerContext = customer
    ? {
        id: customer.id,
        name: customer.name,
        segment: customer.segment,
        kycStatus: customer.kycStatus,
      }
    : undefined;

  const handleAccountChange = (acctId: string) => {
    const newUrl = acctId
      ? `/customers/${id}/positions?account=${acctId}`
      : `/customers/${id}/positions`;
    router.replace(newUrl, { scroll: false });
  };

  const accounts = portfolio?.accounts || [];
  const filteredAccounts = accounts.filter(
    (a) => !selectedAccount || a.accountId === selectedAccount,
  );

  const shownPositions = filteredAccounts.flatMap((a) => a.positions);
  const totalMarketValue = shownPositions.reduce((acc, p) => acc + p.marketValue, 0);
  const totalCostBasis = shownPositions.reduce((acc, p) => acc + p.costBasis, 0);
  const totalUnrealisedPnl = totalMarketValue - totalCostBasis;

  return (
    <ProtectedRoute>
      <AppShell customerContext={customerContext}>
        {isLoading ? (
          <div role="status" aria-label="Loading positions">
            <div className="skel" style={{ height: '44px', width: 'min(360px, 70%)' }} />
            <div
              className="skel"
              style={{ height: '18px', width: 'min(240px, 50%)', marginTop: '14px' }}
            />
            <div className="skel" style={{ height: '320px', marginTop: '34px' }} />
          </div>
        ) : isError || !customer || !portfolio ? (
          <div className="empty panel" role="alert">
            <span className="badge bad">ERROR</span>
            <h2 className="h2">Customer or positions not found</h2>
            <p>{error?.message || 'Unable to retrieve positions from the service.'}</p>
            <div className="flex gap-3 flex-wrap justify-center mt-3">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  refetchCust();
                  refetchPort();
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
            <CustomerHeader customer={customer} activeTab="positions" />

            {/* Account Selector & Freshness header */}
            <div
              className="flex flex-wrap items-end justify-between gap-4"
              style={{ marginBottom: '16px' }}
            >
              <div className="field" style={{ minWidth: '240px' }}>
                <label htmlFor="pos-acct">Account</label>
                <select
                  className="select"
                  id="pos-acct"
                  value={selectedAccount}
                  onChange={(e) => handleAccountChange(e.target.value)}
                >
                  <option value="">All accounts ({accounts.length})</option>
                  {accounts.map((a) => (
                    <option key={a.accountId} value={a.accountId}>
                      {a.accountId}, {ACCOUNT_TYPE_LABELS[a.accountType] || a.accountType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fresh" style={{ border: 0, padding: 0 }}>
                <span className="item">
                  <span className="tick" aria-hidden="true" />
                  Prices as of <b>{fmtDate(portfolio.priceDate)}</b>
                </span>
                <span className="item">
                  Snapshot <b>{fmtDate(portfolio.snapshotDate)}</b>
                </span>
              </div>
            </div>

            {/* Positions Table Panel */}
            <div className="panel" id="pos-region" aria-busy={isLoading || isPortFetching}>
              {shownPositions.length === 0 ? (
                <div className="empty">
                  <Info className="w-7 h-7 text-[var(--ink-3)]" />
                  <h2 className="h2">No positions here</h2>
                  <p className="text-[var(--ink-2)]">
                    {selectedAccount
                      ? `Account ${selectedAccount} has no positions in the latest snapshot.`
                      : 'This customer has no positions in the latest snapshot.'}
                  </p>
                  {selectedAccount && (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => handleAccountChange('')}
                    >
                      Show all accounts
                    </button>
                  )}
                </div>
              ) : (
                <div className="tablewrap relative" style={{ opacity: isPortFetching ? 0.7 : 1, transition: 'opacity 0.15s ease' }}>
                  <TableLoadingBar isFetching={isPortFetching} message="Updating portfolio positions..." />
                  <table className="tbl">
                    <caption className="sr-only">Positions by account</caption>
                    <thead>
                      <tr>
                        <th scope="col">Instrument</th>
                        <th scope="col">Asset class</th>
                        <th scope="col" className="num">
                          Quantity
                        </th>
                        <th scope="col" className="num">
                          Avg cost
                        </th>
                        <th scope="col" className="num">
                          Last price
                        </th>
                        <th scope="col" className="num">
                          Market value
                        </th>
                        <th scope="col" className="num">
                          Unrealised gain or loss
                        </th>
                      </tr>
                    </thead>

                    {filteredAccounts
                      .filter((a) => a.positions.length > 0)
                      .map((a) => {
                        const typeLabel =
                          ACCOUNT_TYPE_LABELS[a.accountType] || cap(a.accountType);
                        const statusClass =
                          a.status === 'ACTIVE'
                            ? 'ok'
                            : a.status === 'DORMANT'
                              ? 'warn'
                              : '';

                        return (
                          <React.Fragment key={a.accountId}>
                            <tbody className="group">
                              <tr>
                                <th colSpan={7} scope="colgroup">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <b>{a.accountId}</b> {typeLabel}, {a.provider}
                                    <span className={`badge ${statusClass}`}>
                                      {cap(a.status)}
                                    </span>
                                    <span style={{ marginLeft: 'auto' }}>
                                      {inr(a.totalMarketValue)}{' '}
                                      <span className={pnlClass(a.totalUnrealisedPnl)}>
                                        ({sgn(a.totalUnrealisedPnl)}
                                        {inr0(Math.abs(a.totalUnrealisedPnl))})
                                      </span>
                                    </span>
                                  </span>
                                </th>
                              </tr>
                            </tbody>

                            <tbody>
                              {a.positions.map((pos) => {
                                const meta = ASSET_META[pos.assetClass] || {
                                  label: pos.assetClass,
                                  color: '#8a9a4b',
                                };

                                return (
                                  <tr key={pos.instrumentId}>
                                    <td>
                                      <span className="cell-main">{pos.symbol}</span>
                                      <span className="cell-sub">{pos.instrumentName}</span>
                                    </td>
                                    <td>
                                      <span
                                        className="swatch"
                                        style={{ background: meta.color }}
                                      />
                                      <span>{meta.label}</span>
                                    </td>
                                    <td className="num">{fmtQty(pos.quantity)}</td>
                                    <td className="num">{inr(pos.avgCostPrice)}</td>
                                    <td className="num">{inr(pos.currentPrice)}</td>
                                    <td className="num">
                                      <b>{inr(pos.marketValue)}</b>
                                    </td>
                                    <td className={`num ${pnlClass(pos.unrealisedPnl)}`}>
                                      {sgn(pos.unrealisedPnl)}
                                      {inr(Math.abs(pos.unrealisedPnl))}
                                      <span
                                        className={`cell-sub ${pnlClass(
                                          pos.unrealisedPnl,
                                        )}`}
                                      >
                                        {sgn(pos.unrealisedPnl)}
                                        {pct(Math.abs(pos.unrealisedPnlPct ?? 0))}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </React.Fragment>
                        );
                      })}

                    <tfoot>
                      <tr>
                        <td colSpan={5}>
                          {selectedAccount ? 'Account total' : 'Customer total'},{' '}
                          {shownPositions.length}{' '}
                          {shownPositions.length === 1 ? 'position' : 'positions'}
                        </td>
                        <td className="num">{inr(totalMarketValue)}</td>
                        <td className={`num ${pnlClass(totalUnrealisedPnl)}`}>
                          {sgn(totalUnrealisedPnl)}
                          {inr(Math.abs(totalUnrealisedPnl))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function PositionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading positions">
          <div className="skel" style={{ height: '44px', width: '360px' }} />
          <div className="skel" style={{ height: '18px', width: '240px', marginTop: '14px' }} />
          <div className="skel" style={{ height: '320px', marginTop: '34px' }} />
        </div>
      }
    >
      <PositionsContent />
    </Suspense>
  );
}

