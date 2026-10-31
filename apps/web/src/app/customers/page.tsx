'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { TableLoadingBar } from '@/components/ui/table-loading-bar';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Pagination } from '@/components/ui/pagination';
import { useCustomers } from '@/hooks/use-customers';
import { inrShort, fmtCount } from '@/lib/formatters';
import type { CustomerSegment, KycStatus } from '@finpilot/shared';

function CustomersDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Read initial states from URL query parameters
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';
  const initialSegment = (searchParams.get('segment') as CustomerSegment | null) || '';
  const initialKyc = (searchParams.get('kyc') as KycStatus | null) || '';
  const initialSortBy = (searchParams.get('sortBy') as 'name' | 'aum' | 'onboardedAt' | 'id') || 'name';
  const initialSortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || 20;

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [segment, setSegment] = useState<CustomerSegment | ''>(initialSegment);
  const [kycStatus, setKycStatus] = useState<KycStatus | ''>(initialKyc);
  const [sortBy, setSortBy] = useState<'name' | 'aum' | 'onboardedAt' | 'id'>(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (segment) params.set('segment', segment);
    if (kycStatus) params.set('kyc', kycStatus);
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (sortDir !== 'asc') params.set('sortDir', sortDir);
    if (page > 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));

    const qs = params.toString();
    const newPath = qs ? `/customers?${qs}` : '/customers';

    startTransition(() => {
      router.replace(newPath, { scroll: false });
    });
  }, [debouncedSearch, segment, kycStatus, sortBy, sortDir, page, limit, router]);

  // Query customers using TanStack Query
  const { data, isLoading, isError, error, refetch, isPlaceholderData, isFetching } = useCustomers({
    search: debouncedSearch,
    segment,
    kycStatus,
    page,
    limit,
    sortBy,
    sortDir,
  });

  const isSearching = searchInput !== debouncedSearch || (isFetching && Boolean(debouncedSearch.trim()));
  const hasActiveFilters = Boolean(debouncedSearch.trim() || segment || kycStatus);

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSegment('');
    setKycStatus('');
    setSortBy('name');
    setSortDir('asc');
    setPage(1);
  };

  return (
    <>
      {/* Page Header matching mock */}
      <header className="page-head">
        <div>
          <h1 className="h1">Customers</h1>
          <p className="sub" id="cust-count">
            {isLoading && !data
              ? 'Loading customers...'
              : `${fmtCount(data?.meta.total ?? 0)} ${
                  data?.meta.total === 1 ? 'customer' : 'customers'
                }${
                  hasActiveFilters
                    ? ' match your filters'
                    : ' in total'
                }`}
          </p>
        </div>
      </header>

      {/* Filter Bar Panel matching mock */}
      <form
        className="panel panel-body"
        id="cust-filters"
        role="search"
        aria-label="Filter customers"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="filters">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="q">Search</label>
            <div className="searchbox">
              {isSearching ? (
                <Loader2 className="w-4 h-4 ico animate-spin text-[var(--indigo)]" aria-hidden="true" />
              ) : (
                <Search className="w-4 h-4 ico" aria-hidden="true" />
              )}
              <input
                className="input"
                id="q"
                type="search"
                placeholder="C0042, Ira Menon, ira.menon42@example.test, Pune"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-segment">Segment</label>
            <select
              className="select"
              id="f-segment"
              value={segment}
              onChange={(e) => {
                setSegment(e.target.value as CustomerSegment | '');
                setPage(1);
              }}
            >
              <option value="">All segments</option>
              <option value="Mass">Mass</option>
              <option value="Affluent">Affluent</option>
              <option value="HNI">HNI</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-kyc">KYC status</label>
            <select
              className="select"
              id="f-kyc"
              value={kycStatus}
              onChange={(e) => {
                setKycStatus(e.target.value as KycStatus | '');
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEW">In review</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-sort">Sort by</label>
            <select
              className="select"
              id="f-sort"
              value={`${sortBy}|${sortDir}`}
              onChange={(e) => {
                const parts = e.target.value.split('|');
                const field = parts[0] as 'name' | 'aum' | 'onboardedAt' | 'id';
                const dir = (parts[1] ?? 'asc') as 'asc' | 'desc';
                setSortBy(field);
                setSortDir(dir);
                setPage(1);
              }}
            >
              <option value="name|asc">Name, A to Z</option>
              <option value="name|desc">Name, Z to A</option>
              <option value="aum|desc">Highest portfolio value</option>
              <option value="aum|asc">Lowest portfolio value</option>
              <option value="onboardedAt|desc">Newest customers</option>
              <option value="id|asc">Customer ID</option>
            </select>
          </div>
        </div>
      </form>

      {/* Customer Table Panel */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div id="cust-region" aria-live="polite" aria-busy={isLoading || isFetching}>
          {isLoading && !data ? (
            /* Shimmer Skeleton rows matching mock skelRows(9) */
            <div className="p-5" role="status" aria-label="Loading customers">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="skel" style={{ height: '22px', margin: '14px 0' }} />
              ))}
            </div>
          ) : isError ? (
            /* Error Box */
            <div className="empty" role="alert">
              <span className="badge bad">ERROR</span>
              <h2 className="h2">Failed to load customers</h2>
              <p>{error?.message || 'Unable to retrieve customer data from the service.'}</p>
              <div className="flex gap-3 flex-wrap justify-center mt-2">
                <button type="button" className="btn" onClick={() => refetch()}>
                  Try again
                </button>
                <button type="button" className="btn ghost" onClick={resetFilters}>
                  Clear search and filters
                </button>
              </div>
            </div>
          ) : !data || data.data.length === 0 ? (
            /* Empty State matching mock */
            <div className="empty">
              <Search className="w-8 h-8 text-[var(--ink-3)]" aria-hidden="true" />
              <h2 className="h2">
                No customers match{debouncedSearch ? ` “${debouncedSearch}”` : ''}
              </h2>
              <p>Check the spelling, or try a customer ID like C0042, a city, or part of an email address.</p>
              <button type="button" className="btn ghost" onClick={resetFilters}>
                Clear search and filters
              </button>
            </div>
          ) : (
            /* Table matching mock design and typography */
            <>
              <div className="tablewrap relative" style={{ opacity: isFetching || isPlaceholderData ? 0.65 : 1, transition: 'opacity 0.15s ease' }}>
                <TableLoadingBar isFetching={isFetching && !isLoading} message="Loading customers..." />
                <table className="tbl">
                  <caption className="sr-only">
                    Customers, page {data.meta.page} of {data.meta.totalPages}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Customer</th>
                      <th scope="col">City</th>
                      <th scope="col">Segment</th>
                      <th scope="col">KYC</th>
                      <th scope="col">Risk level</th>
                      <th scope="col" className="num">
                        Accounts
                      </th>
                      <th scope="col" className="num">
                        Portfolio value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((c) => (
                      <tr
                        key={c.id}
                        className="clickable"
                        onClick={() => router.push(`/customers/${c.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            router.push(`/customers/${c.id}`);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View details for ${c.name}`}
                      >
                        <td>
                          <Link
                            className="cell-main"
                            href={`/customers/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.name}
                          </Link>
                          <span className="cell-sub">
                            {c.id} &nbsp; {c.email}
                          </span>
                        </td>
                        <td>
                          {c.city}, {c.state}
                        </td>
                        <td>
                          <span className="badge outline">{c.segment}</span>
                        </td>
                        <td>
                          {c.kycStatus === 'VERIFIED' && (
                            <span className="badge ok">KYC verified</span>
                          )}
                          {c.kycStatus === 'PENDING' && (
                            <span className="badge warn">KYC pending</span>
                          )}
                          {c.kycStatus === 'REVIEW' && (
                            <span className="badge bad">KYC in review</span>
                          )}
                        </td>
                        <td>
                          {c.riskLevel ? (
                            <span>{c.riskLevel}</span>
                          ) : (
                            <span className="faint">Not assessed</span>
                          )}
                        </td>
                        <td className="num">{c.accountCount}</td>
                        <td className="num">
                          <b>
                            {c.aum > 0 ? (
                              inrShort(c.aum)
                            ) : (
                              <span className="faint">No holdings</span>
                            )}
                          </b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Bar */}
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense
          fallback={
            <div className="p-8" role="status" aria-label="Loading page">
              <div className="skel" style={{ height: '44px', width: '360px' }} />
              <div className="skel" style={{ height: '18px', width: '240px', marginTop: '14px' }} />
              <div className="skel" style={{ height: '230px', marginTop: '34px' }} />
            </div>
          }
        >
          <CustomersDirectoryContent />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

