import { useState } from 'react'
import { Button } from '../components/ui/Button'

type SetupStep = 'name' | 'pin' | 'confirm' | 'phrase'

interface SetupPageProps {
  onSetup: (name: string, pin: string) => Promise<{ recovery_phrase: string[] }>
}

export function SetupPage({ onSetup }: SetupPageProps) {
  const [step, setStep] = useState<SetupStep>('name')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [phrase, setPhrase] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (pin !== confirmPin) { setError('PINs do not match'); return }
    setLoading(true)
    try {
      const res = await onSetup(name, pin)
      setPhrase(res.recovery_phrase)
      setStep('phrase')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
          <h1
            className="text-[#4F3FF0] text-2xl font-semibold mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Vantage
          </h1>
          <p className="text-[#94A3B8] text-sm mb-8">Let's get you set up.</p>

          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Your name</label>
                <input
                  autoFocus
                  placeholder="What should Vantage call you?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('pin')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1535] focus:outline-none focus:border-[#4F3FF0]"
                />
              </div>
              <Button onClick={() => setStep('pin')} disabled={!name.trim()} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Create a PIN</label>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  placeholder="4–8 digits"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && setStep('confirm')}
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1535] tracking-widest text-center focus:outline-none focus:border-[#4F3FF0]"
                />
              </div>
              <Button onClick={() => setStep('confirm')} disabled={pin.length < 4} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Confirm PIN</label>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN again"
                  value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1535] tracking-widest text-center focus:outline-none focus:border-[#4F3FF0]"
                />
                {error && <p className="text-[#F06B6B] text-sm mt-1">{error}</p>}
              </div>
              <Button onClick={handleCreate} disabled={confirmPin.length < 4 || loading} className="w-full">
                {loading ? 'Setting up...' : 'Create Vantage'}
              </Button>
            </div>
          )}

          {step === 'phrase' && (
            <div className="space-y-6">
              <div>
                <p className="text-[#1A1535] font-medium mb-1">Save your recovery phrase</p>
                <p className="text-[#94A3B8] text-sm">These 6 words are the only way to recover your account. Write them down somewhere safe.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {phrase.map((word, i) => (
                  <div key={i} className="bg-[#F8F7FF] rounded-xl px-3 py-2 text-center">
                    <span className="text-xs text-[#94A3B8]">{i + 1}.</span>
                    <span className="text-sm font-medium text-[#1A1535] ml-1">{word}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => window.location.reload()} className="w-full">
                I've saved my recovery phrase →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
