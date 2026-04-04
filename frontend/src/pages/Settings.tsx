import { useEffect, useState } from 'react'
import TopNav from '../components/TopNav'
import RulesModal from '../components/RulesModal'
import { getSettings, updateName, updateInsightMode, changePIN } from '../lib/api'

export default function Settings() {
  // Name section
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  // PIN section
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pinSaving, setPinSaving] = useState(false)

  // Insight mode
  const [insightMode, setInsightMode] = useState<'always' | 'new_only'>('new_only')
  const [insightSaving, setInsightSaving] = useState(false)

  // Rules modal
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    getSettings().then(settings => {
      if (settings.user_name) setDisplayName(settings.user_name)
      if (settings.insight_mode === 'always' || settings.insight_mode === 'new_only') {
        setInsightMode(settings.insight_mode)
      }
    })
  }, [])

  function handleEditName() {
    setNameInput(displayName)
    setEditingName(true)
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setNameSaving(true)
    try {
      await updateName(nameInput.trim())
      setDisplayName(nameInput.trim())
      setEditingName(false)
    } finally {
      setNameSaving(false)
    }
  }

  async function handleChangePIN(e: React.FormEvent) {
    e.preventDefault()
    setPinMessage(null)
    setPinSaving(true)
    try {
      await changePIN(currentPin, newPin, confirmPin)
      setPinMessage({ type: 'success', text: 'PIN changed successfully.' })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change PIN.'
      setPinMessage({ type: 'error', text: message })
    } finally {
      setPinSaving(false)
    }
  }

  async function handleInsightModeChange(mode: 'always' | 'new_only') {
    setInsightMode(mode)
    setInsightSaving(true)
    try {
      await updateInsightMode(mode)
    } finally {
      setInsightSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav onUploadClick={() => {}} />
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

        {/* Name section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Your Name</h2>
          {editingName ? (
            <div className="flex items-center gap-3">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-xs"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {nameSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-900">{displayName || '—'}</span>
              <button
                onClick={handleEditName}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Edit name"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* PIN change section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Change PIN</h2>
          <form onSubmit={handleChangePIN} className="space-y-3 max-w-xs">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm new PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
                required
              />
            </div>
            {pinMessage && (
              <p className={`text-xs font-medium ${pinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {pinMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pinSaving}
              className="w-full bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {pinSaving ? 'Saving...' : 'Update PIN'}
            </button>
          </form>
        </section>

        {/* PIN reset info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Forgot your PIN?</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            To reset your PIN, you'll need your 6-word recovery phrase from setup. If you've lost it, the only option in V1 is to delete <code className="bg-gray-100 px-1 rounded text-xs">finance.db</code> and start fresh.
          </p>
        </section>

        {/* AI insight mode */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">AI Insights</h2>
          <p className="text-xs text-gray-500 mb-3">When should the AI insight panel appear?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="insight_mode"
                value="always"
                checked={insightMode === 'always'}
                onChange={() => handleInsightModeChange('always')}
                disabled={insightSaving}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-700">Every time I open the app</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="insight_mode"
                value="new_only"
                checked={insightMode === 'new_only'}
                onChange={() => handleInsightModeChange('new_only')}
                disabled={insightSaving}
                className="accent-blue-600"
              />
              <span className="text-sm text-gray-700">Only when there's a new observation or new data</span>
              <span className="text-xs text-gray-400">(default)</span>
            </label>
          </div>
        </section>

        {/* Manage Rules */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Categorization Rules</h2>
          <p className="text-sm text-gray-600 mb-4">
            As you categorize transactions, the app learns patterns. You can view and edit these rules here.
          </p>
          <button
            onClick={() => setShowRules(true)}
            className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
          >
            Manage Learned Rules
          </button>
        </section>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  )
}
