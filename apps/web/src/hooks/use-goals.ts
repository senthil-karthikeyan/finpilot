import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Goal, CreateGoal, UpdateGoal } from '@finpilot/shared';

export function useCustomerGoals(customerId: string) {
  return useQuery<Goal[], Error>({
    queryKey: ['customer-goals', customerId],
    queryFn: () => api.get<Goal[]>(`/api/v1/customers/${customerId}/goals`),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  });
}

export function useCreateGoal(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation<Goal, Error, CreateGoal>({
    mutationFn: (body: CreateGoal) =>
      api.post<Goal>(`/api/v1/customers/${customerId}/goals`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portfolio', customerId] });
    },
  });
}

export function useUpdateGoal(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation<Goal, Error, { goalId: string; body: UpdateGoal }>({
    mutationFn: ({ goalId, body }) =>
      api.patch<Goal>(`/api/v1/goals/${goalId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portfolio', customerId] });
    },
  });
}

export function useDeleteGoal(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (goalId: string) =>
      api.delete<{ success: boolean }>(`/api/v1/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-goals', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-portfolio', customerId] });
    },
  });
}

