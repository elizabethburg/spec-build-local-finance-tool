import { useOllamaStatus } from '../../hooks/useOllamaStatus'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface StatusBannerProps {
  message?: string | null
  type?: 'info' | 'warning' | 'success' | 'error'
}

export function StatusBanner({ message, type = 'info' }: StatusBannerProps) {
  const { data: ollamaStatus } = useOllamaStatus()
  const { data: transactions } = useQuery({
    queryKey: ['transactions', {}],
    queryFn: () => api.getTransactions(),
    staleTime: 30_000,
  })

  const uncategorized = transactions?.filter(t => !t.categorized).length || 0

  const banners: { message: string; type: 'info' | 'warning' }[] = []

  if (ollamaStatus && !ollamaStatus.available) {
    banners.push({
      message: 'AI is offline — Ollama may not be running. Rules-based categorization will be used.',
      type: 'warning',
    })
  }

  if (uncategorized > 0) {
    banners.push({
      message: `You have ${uncategorized} transaction${uncategorized === 1 ? '' : 's'} waiting for review.`,
      type: 'info',
    })
  }

  if (message) {
    banners.unshift({ message, type: type === 'error' ? 'warning' : type as 'info' | 'warning' })
  }

  if (banners.length === 0) return null

  return (
    <div className="space-y-1">
      {banners.map((b, i) => (
        <div
          key={i}
          className={`px-4 py-2.5 text-sm rounded-lg ${
            b.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-[#EAE8FD] text-[#4F3FF0] border border-[#d4d0fa]'
          }`}
        >
          {b.message}
        </div>
      ))}
    </div>
  )
}
