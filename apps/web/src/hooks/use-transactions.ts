import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
  limit: number;
  sortBy: 'tradeDate' | 'amount' | 'transactionType';
  sortDir: 'asc' | 'desc';
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export function useCustomerTransactions(customerId: string, filters: TransactionFilters) {
  return useQuery<TransactionsResponse, Error>({
    queryKey: ['customer-transactions', customerId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.accountId) params.set('accountId', filters.accountId);
      if (filters.instrumentId) params.set('instrumentId', filters.instrumentId);
      if (filters.transactionType) params.set('transactionType', filters.transactionType);
      if (filters.status) params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.isFuture !== undefined) params.set('isFuture', String(filters.isFuture));

      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      params.set('sortBy', filters.sortBy);
      params.set('sortDir', filters.sortDir);

      return api.get<TransactionsResponse>(
        `/api/v1/customers/${customerId}/transactions?${params.toString()}`,
      );
    },
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

