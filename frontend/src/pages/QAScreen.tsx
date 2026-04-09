import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QACard from '../components/QACard'
import { getNextQACard, submitQAAnswer, bulkApplyCategory, getCategories } from '../lib/api'

type Phase = 'loading' | 'card' | 'bulk-apply' | 'done'

export default function QAScreen() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [card, setCard] = useState<any>(null)
  const [progress, setProgress] = useState({ current: 1, total: 1 })
  const [pendingAnswer, setPendingAnswer] = useState<{ merchant: string; category: string } | null>(null)
  const [similarCount, setSimilarCount] = useState(0)
  const [similarMerchantRaw, setSimilarMerchantRaw] = useState('')
  const [summary, setSummary] = useState({ categorized: 0, total: 0, flagged: 0 })
  const [allCategories, setAllCategories] = useState<string[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchNext()
    getCategories().then(setAllCategories).catch(() => {})
  }, [])

  async function fetchNext() {
    setPhase('loading')
    const data = await getNextQACard()
    if (data.done) {
      setSummary({
        categorized: data.categorized,
        total: data.total,
        flagged: data.flagged || 0
      })
      setPhase('done')
    } else {
      setCard(data.card)
      setProgress(data.progress)
      setPhase('card')
    }
  }

  async function handleAnswer(merchant: string, category: string) {
    if (!card) return
    const result = await submitQAAnswer(card.id, merchant, category)

    if (result.similar_count > 0) {
      setPendingAnswer({ merchant, category })
      setSimilarCount(result.similar_count)
      setSimilarMerchantRaw(result.similar_merchant_raw)
      setPhase('bulk-apply')
    } else {
      fetchNext()
    }
  }

  async function handleBulkApply(apply: boolean) {
    if (apply && pendingAnswer && similarMerchantRaw) {
      await bulkApplyCategory(similarMerchantRaw, pendingAnswer.merchant, pendingAnswer.category)
    }
    fetchNext()
  }

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (phase === 'bulk-apply' && pendingAnswer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="max-w-md w-full mx-auto p-8 space-y-5">
          <p className="text-sm font-medium text-gray-800">
            There are <span className="text-blue-600 font-semibold">{similarCount}</span> other transactions from <span className="font-mono bg-gray-100 px-1 rounded text-xs">{similarMerchantRaw}</span>.
          </p>
          <p className="text-sm text-gray-600">Apply <strong>{pendingAnswer.merchant}</strong> &rarr; <strong>{pendingAnswer.category}</strong> to all of them?</p>
          <div className="space-y-2">
            <button
              onClick={() => handleBulkApply(true)}
              className="w-full text-left px-4 py-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors text-sm"
            >
              <span className="font-medium text-blue-600 mr-2">A</span> Yes, update all {similarCount}
            </button>
            <button
              onClick={() => handleBulkApply(false)}
              className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              <span className="font-medium text-blue-600 mr-2">B</span> No, leave them for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="max-w-md w-full mx-auto p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">All done!</h1>
            <p className="text-gray-600">
              Categorized <span className="font-semibold text-gray-900">{summary.categorized}</span> transactions.
              {summary.flagged > 0 && <span className="text-orange-600"> {summary.flagged} flagged for review.</span>}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            See your dashboard &rarr;
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        {card && <QACard key={card.id} card={card} progress={progress} onAnswer={handleAnswer} allCategories={allCategories} />}
      </div>
    </div>
  )
}
