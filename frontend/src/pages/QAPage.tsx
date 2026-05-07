import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, QACard as QACardType } from '../lib/api'
import { Card } from '../components/ui/Card'
import { QACard } from '../components/qa/QACard'
import { useNavigate } from 'react-router-dom'

export function QAPage() {
  const [total, setTotal] = useState<number | null>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: card, isLoading } = useQuery({
    queryKey: ['qa-next'],
    queryFn: () => api.getNextQA(),
    staleTime: 0,
  })

  const answer = useMutation({
    mutationFn: (body: { transaction_id: number; merchant: string; category: string; account_type: string; apply_to_similar?: boolean }) =>
      api.answerQA(body),
    onSuccess: (data) => {
      setTotal(prev => prev === null ? data.remaining + 1 : prev)
      qc.invalidateQueries({ queryKey: ['qa-next'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  if (isLoading) return (
    <div className="max-w-md mx-auto text-center py-16 text-[#94A3B8]">Loading...</div>
  )

  if (!card || 'done' in card) return (
    <div className="max-w-md mx-auto text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#EAE8FD] flex items-center justify-center mx-auto text-3xl">✓</div>
      <h2 className="text-xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        All caught up!
      </h2>
      <p className="text-[#94A3B8] text-sm">All your transactions are categorized.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-5 py-2.5 bg-[#4F3FF0] text-white rounded-xl font-medium hover:bg-[#7B6FF5] transition-colors"
      >
        Go to dashboard
      </button>
    </div>
  )

  const qaCard = card as QACardType
  const accountType = qaCard.account_type || 'CHECKING'

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-[#1A1535] mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Review Transactions
      </h1>
      <p className="text-sm text-[#94A3B8] mb-6">
        These transactions couldn't be automatically classified. Confirm or adjust each one — your choices improve future suggestions.
      </p>
      <Card>
        <QACard
          key={qaCard.transaction_id}
          card={qaCard}
          accountType={accountType}
          remaining={0}
          total={total || 1}
          onAnswer={(merchant, category, applyToSimilar) => {
            answer.mutate({
              transaction_id: qaCard.transaction_id,
              merchant,
              category,
              account_type: accountType,
              apply_to_similar: applyToSimilar,
            })
          }}
        />
      </Card>
    </div>
  )
}
