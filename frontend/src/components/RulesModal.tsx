import { useEffect, useState } from 'react'
import { getRules, updateRule, deleteRule } from '../lib/api'
import type { Rule } from '../lib/api'

interface RulesModalProps {
  onClose: () => void
}

interface EditState {
  vendor_pattern: string
  merchant_name: string
  category: string
}

const inputClass = "w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-dusk"

export default function RulesModal({ onClose }: RulesModalProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ vendor_pattern: '', merchant_name: '', category: '' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    getRules().then(setRules).finally(() => setLoading(false))
  }, [])

  function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setEditState({ vendor_pattern: rule.vendor_pattern, merchant_name: rule.merchant_name, category: rule.category })
    setConfirmDeleteId(null)
  }

  async function saveEdit(id: number) {
    setSavingId(id)
    try {
      await updateRule(id, editState)
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...editState } : r))
      setEditingId(null)
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDelete(id: number) {
    await deleteRule(id)
    setRules(prev => prev.filter(r => r.id !== id))
    setConfirmDeleteId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Learned Categorization Rules</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-4">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No rules learned yet. Upload a file and answer categorization questions to build up your rules.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="pb-2 pr-4">Vendor Pattern</th>
                  <th className="pb-2 pr-4">Merchant Name</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map(rule => (
                  <tr key={rule.id} className="align-top">
                    {editingId === rule.id ? (
                      <>
                        <td className="py-2 pr-4"><input className={inputClass} value={editState.vendor_pattern} onChange={e => setEditState(s => ({ ...s, vendor_pattern: e.target.value }))} /></td>
                        <td className="py-2 pr-4"><input className={inputClass} value={editState.merchant_name} onChange={e => setEditState(s => ({ ...s, merchant_name: e.target.value }))} /></td>
                        <td className="py-2 pr-4"><input className={inputClass} value={editState.category} onChange={e => setEditState(s => ({ ...s, category: e.target.value }))} /></td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button onClick={() => saveEdit(rule.id)} disabled={savingId === rule.id}
                            className="text-xs text-dusk hover:text-dusk/70 font-medium mr-3 disabled:opacity-50">
                            {savingId === rule.id ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 pr-4 text-gray-800 font-mono text-xs">{rule.vendor_pattern}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{rule.merchant_name}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{rule.category}</td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          {confirmDeleteId === rule.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-gray-600">Delete this rule?</span>
                              <button onClick={() => confirmDelete(rule.id)} className="text-xs text-clay hover:text-clay/70 font-medium">Yes</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
                            </span>
                          ) : (
                            <>
                              <button onClick={() => startEdit(rule)} className="text-gray-400 hover:text-gray-700 mr-3 transition-colors" aria-label="Edit rule">
                                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                                </svg>
                              </button>
                              <button onClick={() => setConfirmDeleteId(rule.id)} className="text-gray-400 hover:text-clay transition-colors" aria-label="Delete rule">
                                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
