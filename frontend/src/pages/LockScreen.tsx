import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { unlockAuth, setSessionToken, getAppStatus } from '../lib/api'

export default function LockScreen() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await unlockAuth(pin)
      setSessionToken(data.session_token)

      const appStatus = await getAppStatus()
      if (appStatus.has_transactions) {
        navigate('/dashboard')
      } else {
        navigate('/upload')
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Incorrect PIN') || msg === 'Incorrect PIN') {
        setError('Incorrect PIN — try again')
      } else {
        setError(msg || 'Something went wrong. Please try again.')
      }
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome back</h1>
        <p className="text-gray-500 mb-8 text-center">Enter your PIN to unlock</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="PIN"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="numeric"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
