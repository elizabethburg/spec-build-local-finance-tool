import { useEffect, useState } from 'react'
import TopNav from '../components/TopNav'
import RulesModal from '../components/RulesModal'
import { getSettings, updateName, updateInsightMode, changePIN } from '../lib/api'

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusk"

export default function Settings() {
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pinSaving, setPinSaving] = useState(false)

  const [insightMode, setInsightMode] = useState<'always' | 'new_only'>('new_only')
  const [insightSaving, setInsightSaving] = useState(false)

  const [showRules, setShowRules] = useState(false)

  // Ollama model info
  const [ollamaInfo, setOllamaInfo] = useState<{
    running: boolean
    installed: string[]
    active: string | null
    recommended: string[]
  } | null>(null)

  useEffect(() => {
    fetch('http://localhost:8000/ollama/models')
      .then(r => r.json())
      .then(setOllamaInfo)
      .catch(() => setOllamaInfo({ running: false, installed: [], active: null, recommended: [] }))
  }, [])

  useEffect(() => {
    getSettings().then(settings => {
      if (settings.user_name) setDisplayName(settings.user_name)
      if (settings.insight_mode === 'always' || settings.insight_mode === 'new_only') {
        setInsightMode(settings.insight_mode)
      }
    })
  }, [])

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

  async function handleChangePIN(e: { preventDefault(): void }) {
    e.preventDefault()
    setPinMessage(null)
    setPinSaving(true)
    try {
      await changePIN(currentPin, newPin, confirmPin)
      setPinMessage({ type: 'success', text: 'PIN changed successfully.' })
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
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

        {/* Name */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Your Name</h2>
          {editingName ? (
            <div className="flex items-center gap-3">
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusk flex-1 max-w-xs"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !nameInput.trim()}
                className="text-sm font-medium text-dusk hover:text-dusk/70 disabled:opacity-50"
              >
                {nameSaving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingName(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-900">{displayName || '—'}</span>
              <button
                onClick={() => { setNameInput(displayName); setEditingName(true) }}
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

        {/* PIN change */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Change PIN</h2>
          <form onSubmit={handleChangePIN} className="space-y-3 max-w-xs">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Current PIN</label>
              <input type="password" inputMode="numeric" value={currentPin}
                onChange={e => setCurrentPin(e.target.value)}
                className={inputClass} placeholder="••••" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">New PIN</label>
              <input type="password" inputMode="numeric" value={newPin}
                onChange={e => setNewPin(e.target.value)}
                className={inputClass} placeholder="••••" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirm new PIN</label>
              <input type="password" inputMode="numeric" value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                className={inputClass} placeholder="••••" required />
            </div>
            {pinMessage && (
              <p className={`text-xs font-medium ${pinMessage.type === 'success' ? 'text-sage' : 'text-clay'}`}>
                {pinMessage.text}
              </p>
            )}
            <button type="submit" disabled={pinSaving}
              className="w-full bg-dusk text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-dusk/90 disabled:opacity-50 transition-colors">
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

        {/* AI insights */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">AI Insights</h2>
          <p className="text-xs text-gray-500 mb-3">When should the AI insight panel appear?</p>
          <div className="space-y-2">
            {(['always', 'new_only'] as const).map(mode => (
              <label key={mode} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="insight_mode"
                  value={mode}
                  checked={insightMode === mode}
                  onChange={() => handleInsightModeChange(mode)}
                  disabled={insightSaving}
                  className="accent-dusk"
                />
                <span className="text-sm text-gray-700">
                  {mode === 'always' ? 'Every time I open the app' : 'Only when there\'s a new observation or new data'}
                </span>
                {mode === 'new_only' && <span className="text-xs text-gray-400">(default)</span>}
              </label>
            ))}
          </div>
        </section>

        {/* Rules */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Categorization Rules</h2>
          <p className="text-sm text-gray-600 mb-4">
            As you categorize transactions, the app learns patterns. You can view and edit these rules here.
          </p>
          <button
            onClick={() => setShowRules(true)}
            className="text-sm font-medium text-dusk border border-dusk/30 rounded-lg px-4 py-2 hover:bg-dusk/5 transition-colors"
          >
            Manage Learned Rules
          </button>
        </section>

        {/* Ollama */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">AI Model (Ollama)</h2>

          {!ollamaInfo ? (
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          ) : !ollamaInfo.running ? (
            <div className="bg-clay/10 border border-clay/30 rounded-lg p-4 text-sm text-clay space-y-1">
              <p className="font-medium">Ollama is not running</p>
              <p className="text-clay/80">Start Ollama, then reload this page. The app requires Ollama to categorize transactions and generate insights.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active model */}
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-sage flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Active model</p>
                  <p className="text-sm font-medium text-gray-800 font-mono">{ollamaInfo.active ?? '—'}</p>
                </div>
              </div>

              {/* Installed models */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Installed models</p>
                <div className="space-y-1">
                  {ollamaInfo.installed.map(model => {
                    const isActive = model === ollamaInfo.active
                    const isRecommended = ollamaInfo.recommended.includes(model)
                    return (
                      <div key={model} className="flex items-center gap-2 text-sm">
                        <span className={`font-mono ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                          {model}
                        </span>
                        {isActive && (
                          <span className="text-xs bg-sage/10 text-sage border border-sage/20 rounded px-1.5 py-0.5">
                            in use
                          </span>
                        )}
                        {isRecommended && !isActive && (
                          <span className="text-xs text-gray-400">recommended</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* If no recommended model is installed, show what to pull */}
              {!ollamaInfo.installed.some(m => ollamaInfo.recommended.includes(m)) && (
                <div className="bg-ochre/10 border border-ochre/30 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium text-ochre">No recommended model found</p>
                  <p className="text-gray-600 text-xs">For best results, install one of these in your terminal:</p>
                  <div className="space-y-1">
                    {['llama3.2:3b', 'phi3.5', 'gemma3:4b'].map(m => (
                      <code key={m} className="block text-xs bg-gray-100 rounded px-2 py-1 text-gray-700">
                        ollama pull {m}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  )
}
