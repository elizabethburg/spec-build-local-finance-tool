import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useOllamaStatus() {
  return useQuery({
    queryKey: ['ollama-status'],
    queryFn: api.ollamaStatus,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
