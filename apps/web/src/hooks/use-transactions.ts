import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  Transaction,
  PaginationMeta,
  TransactionType,
  TransactionStatus,
} from '@finpilot/shared';

export interface TransactionFilters {
  accountId?: string;
  instrumentId?: string;
  transactionType?: TransactionType | '';
  status?: TransactionStatus | '';
  startDate?: string;
  endDate?: string;
  isFuture?: boolean;
  page: number;
  pageSize?: number;
  limit?: number;
  sortBy: 'tradeDate' | 'amount' | 'transactionType';
  sortDir: 'asc' | 'desc';
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

function buildTransactionQueryParams(filters: TransactionFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.instrumentId) params.set('instrumentId', filters.instrumentId);
  if (filters.transactionType) params.set('transactionType', filters.transactionType);
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.isFuture !== undefined) params.set('isFuture', String(filters.isFuture));

  const pageSize = Math.min(Math.max(filters.pageSize || filters.limit || 100, 1), 100);
  params.set('page', String(Math.max(filters.page || 1, 1)));
  params.set('pageSize', String(pageSize));
  params.set('limit', String(pageSize));
  params.set('sortBy', filters.sortBy);
  params.set('sortDir', filters.sortDir);

  return params;
}

export function useCustomerTransactions(customerId: string, filters: TransactionFilters) {
  const queryClient = useQueryClient();

  const query = useQuery<TransactionsResponse, Error>({
    queryKey: ['customer-transactions', customerId, filters],
    queryFn: async () => {
      const params = buildTransactionQueryParams(filters);
      return api.get<TransactionsResponse>(
        `/api/v1/customers/${customerId}/transactions?${params.toString()}`,
      );
    },
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // Optional UX enhancement: prefetch the next page when available
  useEffect(() => {
    if (query.data?.meta && query.data.meta.page < query.data.meta.totalPages) {
      const nextPage = query.data.meta.page + 1;
      const nextFilters: TransactionFilters = { ...filters, page: nextPage };
      const nextParams = buildTransactionQueryParams(nextFilters);

      queryClient.prefetchQuery({
        queryKey: ['customer-transactions', customerId, nextFilters],
        queryFn: () =>
          api.get<TransactionsResponse>(
            `/api/v1/customers/${customerId}/transactions?${nextParams.toString()}`,
          ),
        staleTime: 30_000,
      });
    }
  }, [query.data, customerId, filters, queryClient]);

  return query;
}
