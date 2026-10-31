'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CustomerHeader } from '@/components/customers/customer-header';
import { PortfolioHero } from '@/components/portfolio/portfolio-hero';
import { RiskProfileCard } from '@/components/portfolio/risk-profile-card';
import { AssetAllocationCard } from '@/components/portfolio/asset-allocation-card';
import { AccountsListCard } from '@/components/portfolio/accounts-list-card';
import { GoalsPreviewCard } from '@/components/portfolio/goals-preview-card';
import { CashFlowChart } from '@/components/portfolio/cash-flow-chart';
import { RecentTransactionsCard } from '@/components/portfolio/recent-transactions-card';
import {
  useCustomer,
  useCustomerPortfolio,
  useCustomerGoals,
  useCustomerRecentTransactions,
  useCustomerCashFlow,
} from '@/hooks/use-portfolio';

function CustomerOverviewContent() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

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
  } = useCustomerPortfolio(id);

  const { data: goals = [], isLoading: isGoalsLoading } = useCustomerGoals(id);
  const { data: transactionsData } = useCustomerRecentTransactions(id, 5);
  const { data: cashFlowData } = useCustomerCashFlow(id);

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

  return (
    <ProtectedRoute>
      <AppShell customerContext={customerContext}>
        {isLoading ? (
          <div role="status" aria-label="Loading page">
            <div className="skel" style={{ height: '44px', width: 'min(360px, 70%)' }} />
            <div
              className="skel"
              style={{ height: '18px', width: 'min(240px, 50%)', marginTop: '14px' }}
            />
            <div className="grid hero-grid" style={{ marginTop: '34px' }}>
              <div className="skel" style={{ height: '230px' }} />
              <div className="skel" style={{ height: '230px' }} />
            </div>
            <div className="skel" style={{ height: '170px', marginTop: '20px' }} />
          </div>
        ) : isError || !customer || !portfolio ? (
          <div className="empty panel" role="alert">
            <span className="badge bad">ERROR</span>
            <h2 className="h2">Customer not found or failed to load</h2>
            <p>{error?.message || 'Unable to retrieve customer data from the service.'}</p>
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
                onClick={() => router.push('/customers')}
              >
                Back to customers
              </button>
            </div>
          </div>
        ) : (
          <>
            <CustomerHeader customer={customer} activeTab="overview" />

            <div className="stack">
              {/* Hero Grid: Portfolio Value + Risk Profile */}
              <div className="grid hero-grid">
                <PortfolioHero portfolio={portfolio} />
                <RiskProfileCard risk={customer.riskProfile} />
              </div>

              {/* Asset Allocation Breakdown */}
              <AssetAllocationCard allocation={portfolio.allocation} />

              {/* Two Column Grid: Accounts List + Goals Preview */}
              <div className="grid two">
                <AccountsListCard customerId={id} accounts={portfolio.accounts} />
                <GoalsPreviewCard customerId={id} goals={goals} isLoading={isGoalsLoading} />
              </div>

              {/* Two Column Grid: Net Cash Flow Chart + Recent Transactions */}
              <div className="grid two">
                <CashFlowChart
                  months={
                    cashFlowData?.months ||
                    portfolio.monthlyCashFlow ||
                    []
                  }
                />
                <RecentTransactionsCard
                  customerId={id}
                  transactions={transactionsData?.data || []}
                  totalTransactions={transactionsData?.meta.total || 0}
                />
              </div>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

export default function CustomerOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8" role="status" aria-label="Loading page">
          <div className="skel" style={{ height: '44px', width: '360px' }} />
          <div className="skel" style={{ height: '18px', width: '240px', marginTop: '14px' }} />
          <div className="skel" style={{ height: '230px', marginTop: '34px' }} />
        </div>
      }
    >
      <CustomerOverviewContent />
    </Suspense>
  );
}
