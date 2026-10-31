import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CustomerDetail,
  PortfolioResponse,
  CashFlowResponse,
  Goal,
  Transaction,
  PaginationMeta,
} from '@finpilot/shared';

export function useCustomer(id: string) {
  return useQuery<CustomerDetail, Error>({
    queryKey: ['customer', id],
    queryFn: () => api.get<CustomerDetail>(`/api/v1/customers/${id}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCustomerPortfolio(id: string) {
  return useQuery<PortfolioResponse, Error>({
    queryKey: ['customer-portfolio', id],
    queryFn: () => api.get<PortfolioResponse>(`/api/v1/customers/${id}/portfolio`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCustomerCashFlow(id: string) {
  return useQuery<CashFlowResponse, Error>({
    queryKey: ['customer-cashflow', id],
    queryFn: () => api.get<CashFlowResponse>(`/api/v1/customers/${id}/cashflow`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCustomerGoals(id: string) {
  return useQuery<Goal[], Error>({
    queryKey: ['customer-goals', id],
    queryFn: () => api.get<Goal[]>(`/api/v1/customers/${id}/goals`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCustomerRecentTransactions(id: string, limit: number = 5) {
  return useQuery<{ data: Transaction[]; meta: PaginationMeta }, Error>({
    queryKey: ['customer-recent-transactions', id, limit],
    queryFn: () =>
      api.get<{ data: Transaction[]; meta: PaginationMeta }>(
        `/api/v1/customers/${id}/transactions?limit=${limit}&sortBy=tradeDate&sortDir=desc`,
      ),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

