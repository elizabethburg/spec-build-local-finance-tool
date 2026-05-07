import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useDashboard(period = 'this_month') {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => api.getDashboard(period),
    staleTime: 30_000,
  })
}
