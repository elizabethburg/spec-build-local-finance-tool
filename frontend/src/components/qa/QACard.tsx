import { useState } from 'react'
import { formatCurrency, formatDate } from '../../lib/format'
import { Button } from '../ui/Button'

const CATEGORIES = [
  'Groceries', 'Dining & Bars', 'Coffee & Cafes', 'Transportation',
  'Shopping & Retail', 'Entertainment', 'Health & Medical', 'Subscriptions',
  'Utilities & Bills', 'Income', 'Transfer', 'General Household',
  'Gas & Fuel', 'Travel & Hotels', 'Other',
]

interface QACardProps {
  card: {
    type: string
    transaction_id: number
    merchant_raw: string
    amount: number
    date: string
    suggested_merchant?: string
    suggested_category?: string
  }
  accountType: string
  remaining: number
  total: number
  onAnswer: (merchant: string, category: string, applyToSimilar: boolean) => void
}

export function QACard({ card, remaining, total, onAnswer }: QACardProps) {
  const [merchant, setMerchant] = useState(card.suggested_merchant || card.merchant_raw)
  const [category, setCategory] = useState(card.suggested_category || '')
  const [customCategory, setCustomCategory] = useState('')
  const [applyToSimilar, setApplyToSimilar] = useState(false)

  const activeCategory = customCategory.trim() || category

  function submit() {
    if (!activeCategory) return
    onAnswer(merchant, activeCategory, applyToSimilar)
  }

  const hasSuggestion = !!(card.suggested_merchant || card.suggested_category)

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
          {total - remaining} of {total}
        </span>
        <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4F3FF0] rounded-full transition-all"
            style={{ width: `${((total - remaining) / total) * 100}%` }}
          />
        </div>
      </div>

      {hasSuggestion && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#EAE8FD] rounded-lg text-xs text-[#4F3FF0]">
          <span>✦</span>
          <span>Rule matched — review and confirm below</span>
        </div>
      )}

      <div className="bg-[#F8F7FF] rounded-xl p-4 space-y-1">
        <p className="text-xs text-[#94A3B8]">{formatDate(card.date)}</p>
        <p className="font-mono text-xs text-[#94A3B8] mt-0.5">{card.merchant_raw}</p>
        <p className={`text-lg font-semibold tabular-nums ${card.amount < 0 ? 'text-[#F06B6B]' : 'text-[#2ECC8F]'}`}>
          {formatCurrency(Math.abs(card.amount))}
        </p>
      </div>

      <div>
        <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Merchant name</label>
        <input
          value={merchant}
          onChange={e => setMerchant(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0]"
        />
      </div>

      <div>
        <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setCustomCategory('') }}
              className={`px-2 py-2 rounded-lg text-xs text-left transition-colors ${
                category === cat && !customCategory
                  ? 'bg-[#4F3FF0] text-white'
                  : 'bg-gray-100 text-[#4B5563] hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          placeholder="Or type a custom category..."
          value={customCategory}
          onChange={e => { setCustomCategory(e.target.value); if (e.target.value) setCategory('') }}
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0]"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={applyToSimilar}
          onChange={e => setApplyToSimilar(e.target.checked)}
          className="w-4 h-4 rounded text-[#4F3FF0]"
        />
        <span className="text-sm text-[#4B5563]">Apply to similar transactions</span>
      </label>

      <Button onClick={submit} disabled={!activeCategory} className="w-full">
        Confirm
      </Button>
    </div>
  )
}
