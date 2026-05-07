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
  card: { type: string; transaction_id: number; merchant_raw: string; amount: number; date: string }
  accountType: string
  remaining: number
  total: number
  onAnswer: (merchant: string, category: string, applyToSimilar: boolean) => void
}

export function QACard({ card, accountType, remaining, total, onAnswer }: QACardProps) {
  const [merchant, setMerchant] = useState(card.merchant_raw)
  const [category, setCategory] = useState('')
  const [applyToSimilar, setApplyToSimilar] = useState(false)

  function submit() {
    if (!category) return
    onAnswer(merchant, category, applyToSimilar)
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider">
          {total - remaining + 1} of {total}
        </span>
        <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4F3FF0] rounded-full transition-all"
            style={{ width: `${((total - remaining + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-[#F8F7FF] rounded-xl p-4 space-y-1">
        <p className="text-xs text-[#94A3B8]">{formatDate(card.date)}</p>
        <p className="font-mono text-sm text-[#1A1535]">{card.merchant_raw}</p>
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
              onClick={() => setCategory(cat)}
              className={`px-2 py-2 rounded-lg text-xs text-left transition-colors ${
                category === cat
                  ? 'bg-[#4F3FF0] text-white'
                  : 'bg-gray-100 text-[#4B5563] hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
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

      <Button onClick={submit} disabled={!category} className="w-full">
        Confirm
      </Button>
    </div>
  )
}
