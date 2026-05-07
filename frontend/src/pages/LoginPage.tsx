import { useState, KeyboardEvent } from 'react'

interface LoginPageProps {
  onUnlock: (pin: string) => Promise<void>
  error?: string | null
}

export function LoginPage({ onUnlock, error }: LoginPageProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleUnlock() {
    if (pin.length < 4) return
    setLoading(true)
    setLocalError(null)
    try {
      await onUnlock(pin)
    } catch {
      setLocalError('Incorrect PIN. Try again.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter') handleUnlock()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A1535' }}>
      <div className="w-full max-w-sm mx-4 text-center">
        <h1
          className="text-4xl font-semibold text-white mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Vantage
        </h1>
        <p className="text-[#94A3B8] mb-12 text-sm">Welcome back</p>

        <div className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={handleKey}
            maxLength={8}
            className="w-full px-5 py-4 rounded-2xl text-center text-xl tracking-[0.3em] bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-[#7B6FF5] text-[#FFFFFF]"
            style={{ letterSpacing: '0.3em' }}
          />

          {(localError || error) && (
            <p className="text-[#F06B6B] text-sm">{localError || error}</p>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || pin.length < 4}
            className="w-full py-4 bg-[#4F3FF0] text-white rounded-2xl font-medium text-[15px] hover:bg-[#7B6FF5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>

        <button className="mt-6 text-[#94A3B8] text-sm hover:text-white transition-colors">
          Forgot PIN?
        </button>
      </div>
    </div>
  )
}
