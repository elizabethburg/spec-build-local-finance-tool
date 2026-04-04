import { useState, useEffect } from 'react'

const CATEGORIES = [
  "Groceries", "Dining & Bars", "Coffee & Cafes",
  "Transportation", "Gas & Fuel", "Travel & Hotels",
  "Shopping & Retail", "General Household", "Entertainment",
  "Health & Medical", "Subscriptions", "Utilities & Bills",
  "Income", "Transfer", "Other"
]

interface TransactionModalProps {
  txnId: number
  onClose: () => void
  onSave: () => void
  onSplit: (txnId: number, amount: number) => void
}

export default function TransactionModal({ txnId, onClose, onSave, onSplit }: TransactionModalProps) {
  const [txn, setTxn] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: '', merchant: '', category: '', amount: '', notes: '', tags: '', reconciled: false
  })

  useEffect(() => {
    fetch(`http://localhost:8000/transactions/${txnId}`)
      .then(r => r.json())
      .then(data => {
        setTxn(data)
        setForm({
          date: data.date,
          merchant: data.merchant,
          category: data.category,
          amount: String(data.amount),
          notes: data.notes || '',
          tags: data.tags || '',
          reconciled: data.reconciled || false,
        })
        setLoading(false)
      })
  }, [txnId])

  async function handleSave() {
    setSaving(true)
    await fetch(`http://localhost:8000/transactions/${txnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        merchant: form.merchant,
        category: form.category,
        amount: parseFloat(form.amount),
        notes: form.notes || null,
        tags: form.tags || null,
        reconciled: form.reconciled,
      }),
    })
    setSaving(false)
    onSave()
    onClose()
  }

  if (loading) return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Transaction details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
              <input type="number" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Merchant</label>
            <input type="text" value={form.merchant}
              onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {txn && txn.merchant_raw !== form.merchant && (
              <p className="text-xs text-gray-400 mt-1 font-mono">Raw: {txn.merchant_raw}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add a note..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
            <input type="text" value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Comma-separated tags" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, reconciled: !f.reconciled }))}
              className={`w-5 h-5 rounded border flex items-center justify-center ${form.reconciled ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
            >
              {form.reconciled && '\u2713'}
            </button>
            <span className="text-sm text-gray-600">Reconciled</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => onSplit(txnId, parseFloat(form.amount))}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Split Transaction
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
