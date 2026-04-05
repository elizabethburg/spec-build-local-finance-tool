import { useState } from 'react'

const CATEGORIES = [
  "Groceries", "Dining & Bars", "Coffee & Cafes",
  "Transportation", "Gas & Fuel", "Travel & Hotels",
  "Shopping & Retail", "General Household", "Entertainment",
  "Health & Medical", "Subscriptions", "Utilities & Bills",
  "Income", "Transfer", "Other"
]

interface SplitModalProps {
  txnId: number
  totalAmount: number
  onClose: () => void
  onSave: () => void
}

export default function SplitModal({ txnId, totalAmount, onClose, onSave }: SplitModalProps) {
  const [splits, setSplits] = useState([
    { category: CATEGORIES[0], amount: '' },
    { category: CATEGORIES[0], amount: '' },
  ])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function addSplit() {
    setSplits([...splits, { category: CATEGORIES[0], amount: '' }])
  }

  function updateSplit(index: number, field: 'category' | 'amount', value: string) {
    setSplits(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
    setError('')
  }

  function removeSplit(index: number) {
    if (splits.length <= 2) return
    setSplits(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    const parsed = splits.map(s => ({
      category: s.category,
      amount: parseFloat(s.amount) || 0
    }))
    const total = parsed.reduce((sum, s) => sum + s.amount, 0)

    if (Math.abs(total - totalAmount) > 0.01) {
      setError(`Splits must sum to $${totalAmount.toFixed(2)}. Current total: $${total.toFixed(2)}`)
      return
    }
    if (parsed.some(s => s.amount <= 0)) {
      setError('Each split must have a positive amount')
      return
    }

    setSaving(true)
    const res = await fetch(`http://localhost:8000/transactions/${txnId}/splits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ splits: parsed }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.detail || 'Failed to save splits')
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
    onClose()
  }

  const currentTotal = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const remaining = totalAmount - currentTotal
  const balanced = Math.abs(remaining) < 0.01

  const selectClass = "flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dusk"
  const inputClass = "w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-dusk"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Split transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total: <span className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</span></span>
            <span className={`text-xs ${balanced ? 'text-sage' : 'text-ochre'}`}>
              {balanced ? '✓ Balanced' : `$${remaining.toFixed(2)} remaining`}
            </span>
          </div>

          {splits.map((split, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={split.category} onChange={e => updateSplit(i, 'category', e.target.value)} className={selectClass}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number" step="0.01" value={split.amount}
                onChange={e => updateSplit(i, 'amount', e.target.value)}
                placeholder="$0.00"
                className={inputClass}
              />
              {splits.length > 2 && (
                <button onClick={() => removeSplit(i)} className="text-gray-300 hover:text-clay text-sm">&times;</button>
              )}
            </div>
          ))}

          <button onClick={addSplit} className="text-sm text-dusk hover:text-dusk/70">
            + Add another split
          </button>

          {error && (
            <div className="bg-clay/10 border border-clay/30 rounded-lg p-3 text-sm text-clay">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-dusk text-white rounded-lg text-sm font-medium hover:bg-dusk/90 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save splits'}
          </button>
        </div>
      </div>
    </div>
  )
}
