import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions, useUpdateTransaction } from '../hooks/useTransactions'
import { useAccounts } from '../hooks/useAccounts'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatDate } from '../lib/format'
import { Transaction, api } from '../lib/api'
import { CATEGORY_COLORS } from '../design/tokens'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const { data: transactions, isLoading } = useTransactions(filters)
  const { data: accounts } = useAccounts()
  const updateTxn = useUpdateTransaction()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const uncategorizedCount = transactions?.filter(t => !t.categorized).length ?? 0
  const allChecked = !!transactions?.length && checkedIds.size === transactions.length

  function handleFilter(key: string, value: string | number | undefined) {
    setFilters(f => ({ ...f, [key]: value || undefined }))
  }

  function toggleCheck(id: number) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(transactions?.map(t => t.id) ?? []))
    }
  }

  const splitTxn = useMutation({
    mutationFn: ({ id, splits }: { id: number; splits: { category: string; amount: number }[] }) =>
      api.splitTransaction(id, splits),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setSelected(null)
    },
  })

  const deleteTxn = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setSelected(null)
    },
  })

  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => api.bulkDeleteTransactions(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setCheckedIds(new Set())
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Transactions
      </h1>

      {uncategorizedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#FFF8E7] border border-[#F5C842] rounded-xl text-sm">
          <span className="text-[#856404]">
            {uncategorizedCount} transaction{uncategorizedCount !== 1 ? 's' : ''} need{uncategorizedCount === 1 ? 's' : ''} review
          </span>
          <button
            onClick={() => navigate('/qa')}
            className="text-[#4F3FF0] font-medium hover:underline text-xs"
          >
            Go to Review →
          </button>
        </div>
      )}

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

      {/* Bulk action bar */}
      {checkedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1A1535] rounded-xl text-white text-sm">
          <span>{checkedIds.size} selected</span>
          <div className="flex gap-3">
            <button onClick={() => setCheckedIds(new Set())} className="text-[#94A3B8] hover:text-white text-xs">
              Clear
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${checkedIds.size} transaction${checkedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) {
                  bulkDelete.mutate(Array.from(checkedIds))
                }
              }}
              className="text-[#F06B6B] hover:text-red-300 text-xs font-medium"
            >
              Delete {checkedIds.size} transaction{checkedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

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
                  <th className="py-2 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded text-[#4F3FF0] cursor-pointer"
                    />
                  </th>
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
                    className={`border-b border-gray-50 hover:bg-[#F8F7FF] transition-colors ${checkedIds.has(txn.id) ? 'bg-[#F0EFFF]' : ''}`}
                  >
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(txn.id)}
                        onChange={() => toggleCheck(txn.id)}
                        className="w-4 h-4 rounded text-[#4F3FF0] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 text-sm text-[#94A3B8] cursor-pointer" onClick={() => setSelected(txn)}>{formatDate(txn.date)}</td>
                    <td className="py-3 px-3 text-sm text-[#1A1535] font-medium cursor-pointer" onClick={() => setSelected(txn)}>{txn.merchant || txn.merchant_raw}</td>
                    <td className="py-3 px-3 cursor-pointer" onClick={() => setSelected(txn)}>
                      {txn.is_split ? (
                        <span className="text-xs text-[#4F3FF0] font-medium">Split</span>
                      ) : txn.category ? (
                        <Badge label={txn.category} />
                      ) : (
                        <span className="text-xs text-[#F5A623] font-medium">Needs review</span>
                      )}
                    </td>
                    <td className={`py-3 px-3 text-sm text-right tabular-nums font-medium cursor-pointer ${txn.amount < 0 ? 'text-[#F06B6B]' : 'text-[#2ECC8F]'}`} onClick={() => setSelected(txn)}>
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
          onSplit={(splits) => splitTxn.mutate({ id: selected.id, splits })}
          onDelete={() => {
            if (confirm('Delete this transaction? This cannot be undone.')) {
              deleteTxn.mutate(selected.id)
            }
          }}
        />
      )}
    </div>
  )
}

function TransactionModal({
  txn, onClose, onSave, onSplit, onDelete
}: {
  txn: Transaction
  onClose: () => void
  onSave: (data: { merchant?: string; category?: string; notes?: string }) => Promise<void>
  onSplit: (splits: { category: string; amount: number }[]) => void
  onDelete: () => void
}) {
  const [merchant, setMerchant] = useState(txn.merchant || txn.merchant_raw)
  const [category, setCategory] = useState(txn.category || '')
  const [customCategory, setCustomCategory] = useState('')
  const [notes, setNotes] = useState(txn.notes || '')
  const [saving, setSaving] = useState(false)
  const [splitMode, setSplitMode] = useState(txn.is_split)
  const [splits, setSplits] = useState<{ category: string; amount: number }[]>(
    txn.split_items?.map(s => ({ category: s.category, amount: s.amount })) ||
    [{ category: '', amount: Math.abs(txn.amount) }, { category: '', amount: 0 }]
  )

  const activeCategory = customCategory.trim() || category

  async function handleSave() {
    setSaving(true)
    await onSave({ merchant, category: activeCategory || undefined, notes: notes || undefined })
    setSaving(false)
  }

  function handleSplit() {
    const total = splits.reduce((s, item) => s + (Number(item.amount) || 0), 0)
    if (Math.abs(total - Math.abs(txn.amount)) > 0.01) return
    if (splits.some(s => !s.category)) return
    onSplit(splits)
  }

  function updateSplit(i: number, field: 'category' | 'amount', value: string | number) {
    setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function addSplitRow() {
    setSplits(prev => [...prev, { category: '', amount: 0 }])
  }

  function removeSplitRow(i: number) {
    setSplits(prev => prev.filter((_, idx) => idx !== i))
  }

  const splitTotal = splits.reduce((s, item) => s + (Number(item.amount) || 0), 0)
  const splitRemaining = Math.abs(txn.amount) - splitTotal
  const splitValid = Math.abs(splitRemaining) < 0.01 && splits.every(s => s.category)

  return (
    <Modal open title="Edit Transaction" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-[#F8F7FF] rounded-xl p-4">
          <p className="text-xs text-[#94A3B8]">{formatDate(txn.date)}</p>
          <p className="font-mono text-xs text-[#94A3B8] mt-0.5">{txn.merchant_raw}</p>
          <p className={`text-xl font-semibold tabular-nums mt-1 ${txn.amount < 0 ? 'text-[#F06B6B]' : 'text-[#2ECC8F]'}`}>
            {txn.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSplitMode(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${!splitMode ? 'bg-[#4F3FF0] text-white' : 'bg-gray-100 text-[#4B5563]'}`}
          >
            Single category
          </button>
          <button
            onClick={() => setSplitMode(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${splitMode ? 'bg-[#4F3FF0] text-white' : 'bg-gray-100 text-[#4B5563]'}`}
          >
            Split across categories
          </button>
        </div>

        {!splitMode ? (
          <>
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
                    onClick={() => { setCategory(cat); setCustomCategory('') }}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      category === cat && !customCategory ? 'text-white' : 'bg-gray-100 text-[#4B5563] hover:bg-gray-200'
                    }`}
                    style={category === cat && !customCategory ? { backgroundColor: CATEGORY_COLORS[cat] || '#4F3FF0' } : {}}
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
              <button
                onClick={onDelete}
                className="text-[#F06B6B] text-sm hover:text-red-700 transition-colors"
              >
                Delete
              </button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              {splits.map((split, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={split.category}
                    onChange={e => updateSplit(i, 'category', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0]"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.amount}
                    onChange={e => updateSplit(i, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#1A1535] focus:outline-none focus:border-[#4F3FF0] tabular-nums"
                  />
                  {splits.length > 2 && (
                    <button onClick={() => removeSplitRow(i)} className="text-[#94A3B8] hover:text-[#F06B6B] text-lg leading-none">×</button>
                  )}
                </div>
              ))}
              <button onClick={addSplitRow} className="text-xs text-[#4F3FF0] hover:underline">+ Add row</button>
            </div>

            <div className={`text-xs px-3 py-2 rounded-lg ${splitValid ? 'bg-[#EAF7F1] text-[#2ECC8F]' : 'bg-gray-100 text-[#94A3B8]'}`}>
              {splitValid
                ? 'Splits balance — ready to save'
                : `Remaining to allocate: ${formatCurrency(Math.abs(splitRemaining))}`}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSplit} disabled={!splitValid} className="flex-1">
                Save split
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
