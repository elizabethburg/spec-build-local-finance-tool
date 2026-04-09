import { useEffect, useState, useRef } from 'react'
import TopNav from '../components/TopNav'
import UploadModal from '../components/UploadModal'
import TransactionModal from '../components/TransactionModal'
import SplitModal from '../components/SplitModal'
import { getTransactions, getInstitutions, renameInstitution, updateTransactionCategory, bulkUpdateCategory, deleteInstitutionTransactions } from '../lib/api'

const CATEGORIES = [
  "Groceries", "Dining & Bars", "Coffee & Cafes",
  "Transportation", "Gas & Fuel", "Travel & Hotels",
  "Shopping & Retail", "General Household", "Entertainment",
  "Health & Medical", "Subscriptions", "Utilities & Bills",
  "Income", "Transfer", "Other", "Uncategorized"
]

interface Txn {
  id: number
  date: string
  merchant: string
  merchant_raw: string
  category: string
  amount: number
  type: string
  institution: string
  is_split: boolean
  parent_id: number | null
}

interface Institution {
  id: number
  name_raw: string
  name_display: string
}

export default function Transactions() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [editingCategory, setEditingCategory] = useState<number | null>(null)
  const [bulkPrompt, setBulkPrompt] = useState<{ merchant_raw: string; merchant: string; category: string; count: number } | null>(null)
  const [renamingInst, setRenamingInst] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [useGenericLabels, setUseGenericLabels] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedTxn, setSelectedTxn] = useState<number | null>(null)
  const [splitTarget, setSplitTarget] = useState<{ id: number; amount: number } | null>(null)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [t, i] = await Promise.all([getTransactions(), getInstitutions()])
    setTxns(t)
    setInstitutions(i)
  }

  const topLevel = txns.filter(t => t.parent_id === null)
  const childrenOf = (parentId: number) => txns.filter(t => t.parent_id === parentId)
  const filteredTxns = activeTab === 'all' ? topLevel : topLevel.filter(t => t.institution === activeTab)

  async function handleCategoryChange(txn: Txn, newCategory: string) {
    setEditingCategory(null)
    const result = await updateTransactionCategory(txn.id, newCategory)
    setTxns(prev => prev.map(t => t.id === txn.id ? { ...t, category: newCategory } : t))
    if (result.similar_count > 0) {
      setBulkPrompt({ merchant_raw: result.merchant_raw, merchant: txn.merchant, category: newCategory, count: result.similar_count })
    }
  }

  async function handleBulkApply(apply: boolean) {
    if (apply && bulkPrompt) {
      await bulkUpdateCategory(bulkPrompt.merchant_raw, bulkPrompt.category, bulkPrompt.merchant)
      setTxns(prev => prev.map(t =>
        t.merchant_raw === bulkPrompt.merchant_raw && t.category !== bulkPrompt.category
          ? { ...t, category: bulkPrompt.category } : t
      ))
    }
    setBulkPrompt(null)
  }

  async function handleRename(inst: Institution) {
    if (!renameValue.trim()) return
    await renameInstitution(inst.id, renameValue.trim())
    setInstitutions(prev => prev.map(i => i.id === inst.id ? { ...i, name_display: renameValue.trim() } : i))
    setRenamingInst(null)
    setRenameValue('')
  }

  async function handleBatchDelete() {
    setDeletingBatch(true)
    try {
      await deleteInstitutionTransactions(activeTab)
      await loadData()
      setActiveTab('all')
      setShowBatchDeleteConfirm(false)
    } catch (e) {
      console.error('Batch delete failed:', e)
    }
    setDeletingBatch(false)
  }

  function getTabLabel(inst: Institution, index: number) {
    if (!useGenericLabels) return inst.name_display
    const type = inst.name_raw.toLowerCase().includes('credit') ? 'Credit Card' : 'Bank'
    return `${type} ${index + 1}`
  }

  const tabActive = 'bg-gray-900 text-white'
  const tabInactive = 'text-gray-500 hover:text-gray-800'

  return (
    <>
      <TopNav onUploadClick={() => setUploadOpen(true)} />

      {uploadOpen && (
        <UploadModal onClose={() => { setUploadOpen(false); loadData() }} />
      )}

      {bulkPrompt && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="text-sm text-gray-800">
              <span className="font-semibold">{bulkPrompt.count}</span> other transactions from{' '}
              <span className="font-mono text-xs bg-gray-100 px-1 rounded">{bulkPrompt.merchant_raw}</span> have a different category.
            </p>
            <p className="text-sm text-gray-600">Update all to <strong>{bulkPrompt.category}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={() => handleBulkApply(true)}
                className="flex-1 bg-dusk text-white rounded-lg py-2 text-sm font-medium hover:bg-dusk/90">
                Yes, update all
              </button>
              <button onClick={() => handleBulkApply(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Account tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'all' ? tabActive : tabInactive}`}
          >
            All Accounts
          </button>
          {institutions.map((inst, i) => (
            <div key={inst.id} className="flex items-center gap-1">
              {renamingInst === inst.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(inst); if (e.key === 'Escape') setRenamingInst(null) }}
                    className="border border-dusk/40 rounded px-2 py-1 text-sm w-32 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleRename(inst)} className="text-xs text-dusk">Save</button>
                  <button onClick={() => setRenamingInst(null)} className="text-xs text-gray-400">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab(inst.name_raw)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === inst.name_raw ? tabActive : tabInactive}`}
                >
                  {getTabLabel(inst, i)}
                  <span
                    onClick={e => { e.stopPropagation(); setRenamingInst(inst.id); setRenameValue(inst.name_display) }}
                    className="opacity-40 hover:opacity-100 cursor-pointer"
                    aria-label={`Rename ${getTabLabel(inst, i)}`}
                    role="button"
                  >
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          ))}
          {institutions.length > 0 && (
            <>
              <button
                onClick={() => setUseGenericLabels(g => !g)}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                {useGenericLabels ? 'Show institution names' : 'Use generic labels'}
              </button>
              {activeTab !== 'all' && (
                <button
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  className="text-xs text-clay hover:text-clay/70 ml-2"
                  title="Delete all transactions from this institution"
                >
                  🗑
                </button>
              )}
            </>
          )}
        </div>

        {/* Batch delete confirmation */}
        {showBatchDeleteConfirm && (
          <div className="bg-clay/10 border border-clay/30 rounded-lg p-4 space-y-3">
            <p className="text-sm text-clay font-medium">Delete all transactions from this institution?</p>
            <p className="text-xs text-clay/80">This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                disabled={deletingBatch}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deletingBatch}
                className="px-3 py-1.5 text-xs bg-clay text-white rounded font-medium hover:bg-clay/90 disabled:opacity-40"
              >
                {deletingBatch ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Transaction table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Merchant</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">No transactions</td>
                </tr>
              ) : filteredTxns.map(txn => (
                <>
                  <tr
                    key={txn.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTxn(txn.id)}
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{txn.date}</td>
                    <td className="px-4 py-3 text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {txn.is_split && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setExpandedRows(prev => {
                                const next = new Set(prev)
                                next.has(txn.id) ? next.delete(txn.id) : next.add(txn.id)
                                return next
                              })
                            }}
                            className="text-gray-400 hover:text-gray-600 text-xs"
                            aria-label={expandedRows.has(txn.id) ? 'Collapse splits' : 'Expand splits'}
                            aria-expanded={expandedRows.has(txn.id)}
                          >
                            {expandedRows.has(txn.id) ? '▼' : '▶'}
                          </button>
                        )}
                        {txn.merchant}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {editingCategory === txn.id ? (
                        <div ref={categoryDropdownRef} className="relative">
                          <select
                            autoFocus
                            defaultValue={txn.category}
                            onChange={e => handleCategoryChange(txn, e.target.value)}
                            onBlur={() => setEditingCategory(null)}
                            className="border border-dusk/40 rounded px-2 py-1 text-sm focus:outline-none bg-white"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingCategory(txn.id)}
                          className="text-gray-600 hover:text-dusk hover:underline transition-colors text-left"
                          aria-label={`Edit category: ${txn.category}`}
                        >
                          {txn.category}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${txn.type === 'credit' ? 'text-sage' : 'text-gray-900'}`}>
                      {txn.type === 'credit' ? '+' : ''}{txn.amount < 0 ? '-' : ''}${Math.abs(txn.amount).toFixed(2)}
                    </td>
                  </tr>
                  {txn.is_split && expandedRows.has(txn.id) && childrenOf(txn.id).map(child => (
                    <tr key={`split-${child.id}`} className="bg-gray-50 border-b border-gray-50">
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 pl-8 text-gray-400 text-xs italic">↳ split</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{child.category}</td>
                      <td className="px-4 py-2 text-right text-gray-500 text-xs">${child.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {selectedTxn && (
        <TransactionModal
          txnId={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onSave={loadData}
          onDelete={() => { setSelectedTxn(null); loadData() }}
          onSplit={(id, amount) => { setSelectedTxn(null); setSplitTarget({ id, amount }) }}
        />
      )}
      {splitTarget && (
        <SplitModal
          txnId={splitTarget.id}
          totalAmount={splitTarget.amount}
          onClose={() => setSplitTarget(null)}
          onSave={loadData}
        />
      )}
    </>
  )
}
