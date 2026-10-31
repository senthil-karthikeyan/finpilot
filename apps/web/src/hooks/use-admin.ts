import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  ImportBatch,
  ImportResponse,
  ImportRowResult,
  DataQualityResponse,
  PaginatedRejectedRowsResponse,
} from '@finpilot/shared';

export interface BatchDetailResponse {
  batch: ImportBatch;
  rows: ImportRowResult[];
}

export function useImportBatches() {
  return useQuery<ImportBatch[], Error>({
    queryKey: ['admin-imports'],
    queryFn: () => api.get<ImportBatch[]>('/api/v1/admin/imports'),
    staleTime: 30_000,
  });
}

export function useImportBatch(batchId: string) {
  return useQuery<BatchDetailResponse, Error>({
    queryKey: ['admin-import-batch', batchId],
    queryFn: () =>
      api.get<BatchDetailResponse>(`/api/v1/admin/imports/${encodeURIComponent(batchId)}`),
    enabled: Boolean(batchId),
    staleTime: 60_000,
  });
}

export function useRejectedRows(
  batchId: string,
  page: number = 1,
  pageSize: number = 20,
  outcome?: string,
) {
  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (outcome && outcome !== 'all') {
    queryParams.set('outcome', outcome);
  }

  return useQuery<PaginatedRejectedRowsResponse, Error>({
    queryKey: ['admin-import-rejected-rows', batchId, page, pageSize, outcome || 'all'],
    queryFn: () =>
      api.get<PaginatedRejectedRowsResponse>(
        `/api/v1/admin/imports/${encodeURIComponent(batchId)}/rejected?${queryParams.toString()}`,
      ),
    enabled: Boolean(batchId),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}

export function useDataQuality() {
  return useQuery<DataQualityResponse, Error>({
    queryKey: ['admin-data-quality'],
    queryFn: () => api.get<DataQualityResponse>('/api/v1/admin/data-quality'),
    staleTime: 30_000,
  });
}

export function useUploadTransactionsCsv() {
  const queryClient = useQueryClient();

  return useMutation<ImportResponse, Error, FormData>({
    mutationFn: (formData: FormData) =>
      api.post<ImportResponse>('/api/v1/admin/imports/transactions', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-imports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-data-quality'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
