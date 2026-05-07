import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useTransactions(params: {
  account_id?: number; category?: string; from?: string; to?: string; search?: string;
} = {}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.getTransactions(params),
    staleTime: 10_000,
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { merchant?: string; category?: string; notes?: string } }) =>
      api.updateTransaction(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
