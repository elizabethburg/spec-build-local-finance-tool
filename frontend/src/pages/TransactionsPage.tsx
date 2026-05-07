import { useState } from 'react'
import { useTransactions, useUpdateTransaction } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate } from '../lib/format'
import { Transaction } from '../lib/api'
import { CATEGORY_COLORS } from '../design/tokens'

const CATEGORIES = [
  'Groceries', 'Dining & Bars', 'Coffee & Cafes', 'Transportation',
  'Shopping & Retail', 'Entertainment', 'Health & Medical', 'Subscriptions',
  'Utilities & Bills', 'Income', 'Transfer', 'General Household',
  'Gas & Fuel', 'Travel & Hotels', 'Other',
]

export function TransactionsPage() {
  const [filters, setFilters] = useState<{
    account_id?: number; category?: string; from?: string; to?: string; search?: string;
  }>({})
  const [selected, setSelected] = useState<Transaction | null>(null)
  const { data: transactions, isLoading } = useTransactions(filters)
  const { data: accounts } = useAccounts()
  const updateTxn = useUpdateTransaction()

  function handleFilter(key: string, value: string | number | undefined) {
    setFilters(f => ({ ...f, [key]: value || undefined }))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Transactions
      </h1>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Search merchant..."
            onChange={e => handleFilter('search', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4F3FF0] w-48"
          />
          <select
            onChange={e => handleFilter('account_id', e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#4B5563] focus:outline-none focus:border-[#4F3FF0]"
          >
            <option value="">All accounts</option>
            {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            onChange={e => handleFilter('category', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#4B5563] focus:outline-none focus:border-[#4F3FF0]"
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" onChange={e => handleFilter('from', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#4B5563] focus:outline-none focus:border-[#4F3FF0]"
          />
          <input type="date" onChange={e => handleFilter('to', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#4B5563] focus:outline-none focus:border-[#4F3FF0]"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="sm">
        {isLoading ? (
          <div className="text-[#94A3B8] text-sm py-6 text-center">Loading transactions...</div>
        ) : !transactions?.length ? (
          <div className="text-[#94A3B8] text-sm py-6 text-center">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 px-3 text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Merchant</th>
                  <th className="text-left py-2 px-3 text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Category</th>
                  <th className="text-right py-2 px-3 text-xs text-[#94A3B8] font-medium uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr
                    key={txn.id}
                    onClick={() => setSelected(txn)}
                    className="border-b border-gray-50 hover:bg-[#F8F7FF] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-[#94A3B8]">{formatDate(txn.date)}</td>
                    <td className="py-3 px-3 text-sm text-[#1A1535] font-medium">{txn.merchant || txn.merchant_raw}</td>
                    <td className="py-3 px-3">
                      {txn.category ? <Badge label={txn.category} /> : (
                        <span className="text-xs text-[#94A3B8]">Uncategorized</span>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-sm text-right tabular-nums font-medium ${txn.amount < 0 ? 'text-[#F06B6B]' : 'text-[#2ECC8F]'}`}>
                      {txn.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      {selected && (
        <TransactionModal
          txn={selected}
          onClose={() => setSelected(null)}
          onSave={async (data) => {
            await updateTxn.mutateAsync({ id: selected.id, body: data })
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function TransactionModal({
  txn, onClose, onSave
}: {
  txn: Transaction
  onClose: () => void
  onSave: (data: { merchant?: string; category?: string; notes?: string }) => Promise<void>
}) {
  const [merchant, setMerchant] = useState(txn.merchant || txn.merchant_raw)
  const [category, setCategory] = useState(txn.category || '')
  const [notes, setNotes] = useState(txn.notes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ merchant, category: category || undefined, notes: notes || undefined })
    setSaving(false)
  }

  return (
    <Modal open title="Edit Transaction" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">{formatDate(txn.date)}</p>
          <p className="font-mono text-sm text-[#94A3B8] mt-0.5">{txn.merchant_raw}</p>
          <p className={`text-xl font-semibold tabular-nums mt-1 ${txn.amount < 0 ? 'text-[#F06B6B]' : 'text-[#2ECC8F]'}`}>
            {txn.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
          </p>
        </div>

        <div>
          <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Merchant</label>
          <input
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0]"
          />
        </div>

        <div>
          <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Category</label>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  category === cat ? 'text-white' : 'bg-gray-100 text-[#4B5563] hover:bg-gray-200'
                }`}
                style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat] || '#4F3FF0' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
