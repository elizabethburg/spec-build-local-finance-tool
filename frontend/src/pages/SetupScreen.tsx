import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setupAuth, setSessionToken } from '../lib/api'

type Phase = 'form' | 'phrase' | 'done'

export default function SetupScreen() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('form')

  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [recoveryPhrase, setRecoveryPhrase] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Please enter your name.'); return }
    if (pin.length < 4) { setError('PIN must be at least 4 digits.'); return }
    if (pin !== confirmPin) { setError('PINs do not match.'); return }

    setLoading(true)
    try {
      const data = await setupAuth(name.trim(), pin, confirmPin)
      setSessionToken(data.session_token)
      setRecoveryPhrase(data.recovery_phrase)
      setPhase('phrase')
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handlePhraseConfirmed() {
    navigate('/upload')
  }

  if (phase === 'form') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-500 mb-8">Set up your finance dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-dusk"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Choose a PIN"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-dusk"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="Re-enter your PIN"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-dusk"
                inputMode="numeric"
              />
            </div>

            {error && <p className="text-clay text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dusk hover:bg-dusk/90 disabled:bg-dusk/50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Setting up...' : 'Get Started'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (phase === 'phrase') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Save your recovery phrase</h1>
          <p className="text-gray-500 mb-6">
            If you forget your PIN, you'll need this phrase to regain access.
            Write it down and keep it somewhere safe.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <p className="text-lg font-mono font-semibold text-gray-800 text-center leading-relaxed">
              {recoveryPhrase}
            </p>
          </div>

          <p className="text-sm text-ochre bg-ochre/10 border border-ochre/30 rounded-lg p-3 mb-6">
            This phrase will not be shown again. Store it offline.
          </p>

          <button
            onClick={handlePhraseConfirmed}
            className="w-full bg-dusk hover:bg-dusk/90 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            I've written this down
          </button>
        </div>
      </div>
    )
  }

  return null
}
