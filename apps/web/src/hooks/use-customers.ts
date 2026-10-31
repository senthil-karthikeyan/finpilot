import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CustomerSummary,
  PaginationMeta,
  CustomerSegment,
  KycStatus,
} from '@finpilot/shared';

export interface CustomerFilters {
  search?: string;
  segment?: CustomerSegment | '';
  kycStatus?: KycStatus | '';
  page: number;
  limit: number;
  sortBy: 'name' | 'aum' | 'onboardedAt' | 'id';
  sortDir: 'asc' | 'desc';
}

export interface CustomersResponse {
  data: CustomerSummary[];
  meta: PaginationMeta;
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery<CustomersResponse, Error>({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search && filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.segment) {
        params.set('segment', filters.segment);
      }
      if (filters.kycStatus) {
        params.set('kycStatus', filters.kycStatus);
      }
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));
      params.set('sortBy', filters.sortBy);
      params.set('sortDir', filters.sortDir);

      return api.get<CustomersResponse>(`/api/v1/customers?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

