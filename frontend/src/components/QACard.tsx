import { useState } from 'react'

interface QACardProps {
  card: {
    id: number
    type: 'ambiguous_merchant' | 'ambiguous_category'
    merchant_raw: string
    merchant?: string
    suggested_merchant?: string
    suggested_category: string
    alternatives?: string[]
  }
  progress: { current: number; total: number }
  onAnswer: (merchant: string, category: string) => void
  allCategories?: string[]
}

const CATEGORIES = [
  "Groceries", "Dining & Bars", "Coffee & Cafes",
  "Transportation", "Gas & Fuel", "Travel & Hotels",
  "Shopping & Retail", "General Household", "Entertainment",
  "Health & Medical", "Subscriptions", "Utilities & Bills",
  "Income", "Transfer", "Other"
]

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const optionBase = "w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm"
const optionDefault = `${optionBase} border-gray-200 hover:border-dusk/40 hover:bg-dusk/5`
const optionSuggested = `${optionBase} border-dusk/30 bg-dusk/5`

export default function QACard({ card, progress, onAnswer, allCategories }: QACardProps) {
  const [customText, setCustomText] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  if (card.type === 'ambiguous_merchant') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Merchant confirmation</span>
          <span>{progress.current} of {progress.total}</span>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Raw transaction</p>
          <p className="font-mono text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">{card.merchant_raw}</p>
        </div>

        <p className="text-sm font-medium text-gray-800">What is this merchant?</p>

        <div className="space-y-2">
          <button
            onClick={() => onAnswer(card.suggested_merchant || card.merchant_raw, card.suggested_category)}
            className={optionDefault}
          >
            <span className="font-medium text-dusk mr-2">A</span>
            {card.suggested_merchant || card.merchant_raw}
            <span className="text-gray-400 text-xs ml-2">({card.suggested_category})</span>
          </button>

          {!showCustom ? (
            <button onClick={() => setShowCustom(true)} className={`${optionDefault} text-gray-500`}>
              <span className="font-medium text-dusk mr-2">B</span>
              Type your own...
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Merchant name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusk"
                autoFocus
              />
              <button
                onClick={() => customText && onAnswer(customText, card.suggested_category)}
                disabled={!customText}
                className="w-full bg-dusk text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const categoryOptions = card.alternatives?.length
    ? [card.suggested_category, ...card.alternatives.filter(a => a !== card.suggested_category)].slice(0, 5)
    : CATEGORIES.slice(0, 5)

  const merchantName = card.merchant || card.merchant_raw

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>Category assignment</span>
        <span>{progress.current} of {progress.total}</span>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-800 text-lg">{merchantName}</p>
        {merchantName !== card.merchant_raw && (
          <p className="font-mono text-xs text-gray-400 mt-1">{card.merchant_raw}</p>
        )}
      </div>

      <p className="text-sm text-gray-600">What category is this?</p>

      <div className="space-y-2">
        {categoryOptions.map((cat, i) => (
          <button
            key={cat}
            onClick={() => onAnswer(merchantName, cat)}
            className={i === 0 ? optionSuggested : optionDefault}
          >
            <span className="font-medium text-dusk mr-2">{LETTERS[i]}</span>
            {cat}
            {i === 0 && <span className="text-dusk/60 text-xs ml-2">suggested</span>}
          </button>
        ))}

        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} className={`${optionDefault} text-gray-500`}>
            <span className="font-medium text-dusk mr-2">{LETTERS[categoryOptions.length]}</span>
            Other — choose or type...
          </button>
        ) : (
          <div className="space-y-2">
            <input
              list="qa-categories"
              type="text"
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="Category name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusk"
              autoFocus
            />
            <datalist id="qa-categories">
              {(allCategories ?? CATEGORIES).map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <button
              onClick={() => customText && onAnswer(merchantName, customText)}
              disabled={!customText}
              className="w-full bg-dusk text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
