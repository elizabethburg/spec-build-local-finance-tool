import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Rule, Institution } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useOllamaStatus } from '../hooks/useOllamaStatus'

export function SettingsPage() {
  const { data: ollamaStatus } = useOllamaStatus()
  const qc = useQueryClient()

  const { data: rules } = useQuery({ queryKey: ['rules'], queryFn: api.getRules })
  const { data: institutions } = useQuery({ queryKey: ['institutions'], queryFn: api.getInstitutions })

  const deleteRule = useMutation({
    mutationFn: api.deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  const updateInst = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateInstitution(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institutions'] }),
  })

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Settings
      </h1>

      {/* Ollama status */}
      <Card>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">AI Status</p>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${ollamaStatus?.available ? 'bg-[#2ECC8F]' : 'bg-[#F06B6B]'}`} />
          <div>
            <p className="text-sm font-medium text-[#1A1535]">
              {ollamaStatus?.available ? 'Ollama is running' : 'Ollama is offline'}
            </p>
            {ollamaStatus?.active_model && (
              <p className="text-xs text-[#94A3B8]">Model: {ollamaStatus.active_model}</p>
            )}
            {!ollamaStatus?.available && (
              <p className="text-xs text-[#94A3B8]">Start Ollama to enable AI categorization and insights.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Institutions */}
      <Card>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Institutions</p>
        <div className="space-y-2">
          {institutions?.map((inst: Institution) => (
            <InstitutionRow
              key={inst.id}
              institution={inst}
              onSave={(name) => updateInst.mutate({ id: inst.id, name })}
            />
          ))}
          {!institutions?.length && (
            <p className="text-[#94A3B8] text-sm">No institutions yet.</p>
          )}
        </div>
      </Card>

      {/* Categorization rules */}
      <Card>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">
          Categorization Rules ({rules?.length || 0})
        </p>
        <div className="space-y-2">
          {rules?.map((rule: Rule) => (
            <div key={rule.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-[#1A1535]">{rule.merchant_name}</p>
                <p className="text-xs text-[#94A3B8]">{rule.vendor_pattern} → {rule.category}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#94A3B8]">{rule.times_applied}×</span>
                <button
                  onClick={() => deleteRule.mutate(rule.id)}
                  className="text-[#94A3B8] hover:text-[#F06B6B] text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!rules?.length && (
            <p className="text-[#94A3B8] text-sm">No rules yet — they're learned as you categorize transactions.</p>
          )}
        </div>
      </Card>

      {/* Security */}
      <Card>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Security</p>
        <ChangePinForm />
      </Card>
    </div>
  )
}

function InstitutionRow({ institution, onSave }: { institution: Institution; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(institution.name_display)

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4F3FF0]"
          />
          <Button size="sm" onClick={() => { onSave(name); setEditing(false) }}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setName(institution.name_display); setEditing(false) }}>Cancel</Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-[#1A1535]">{institution.name_display}</span>
          <button onClick={() => setEditing(true)} className="text-xs text-[#4F3FF0] hover:underline">Rename</button>
        </>
      )}
    </div>
  )
}

function ChangePinForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState('')

  async function handleChange() {
    try {
      await api.changePin(current, next)
      setMsg('PIN changed successfully.')
      setCurrent(''); setNext('')
    } catch {
      setMsg('Current PIN is incorrect.')
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        placeholder="Current PIN"
        value={current}
        onChange={e => setCurrent(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4F3FF0]"
      />
      <input
        type="password"
        placeholder="New PIN"
        value={next}
        onChange={e => setNext(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#4F3FF0]"
      />
      {msg && <p className="text-sm text-[#2ECC8F]">{msg}</p>}
      <Button onClick={handleChange} disabled={!current || !next} size="sm">
        Change PIN
      </Button>
    </div>
  )
}
