import { useState } from 'react'
import { useAccounts } from '../../hooks/useAccounts'
import { Account } from '../../lib/api'

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', "I don't know"]

interface AccountSelectorProps {
  onSelect: (params: {
    account_id?: number
    institution_name?: string
    account_name?: string
    account_type?: string
  }) => void
}

export function AccountSelector({ onSelect }: AccountSelectorProps) {
  const { data: accounts } = useAccounts()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [institutionName, setInstitutionName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState('')

  function handleSubmit() {
    if (mode === 'existing' && selectedId) {
      onSelect({ account_id: selectedId })
    } else {
      onSelect({
        institution_name: institutionName,
        account_name: accountName,
        account_type: accountType === "I don't know" ? undefined : accountType,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('existing')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'existing' ? 'bg-[#4F3FF0] text-white' : 'bg-gray-100 text-[#4B5563]'
          }`}
        >
          Existing account
        </button>
        <button
          onClick={() => setMode('new')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'new' ? 'bg-[#4F3FF0] text-white' : 'bg-gray-100 text-[#4B5563]'
          }`}
        >
          New account
        </button>
      </div>

      {mode === 'existing' ? (
        <div className="space-y-2">
          {accounts?.map((a: Account) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                selectedId === a.id
                  ? 'border-[#4F3FF0] bg-[#EAE8FD]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-[#1A1535]">{a.name}</div>
              <div className="text-sm text-[#94A3B8]">{a.institution?.name_display} · {a.type}</div>
            </button>
          ))}
          {(!accounts || accounts.length === 0) && (
            <p className="text-[#94A3B8] text-sm">No accounts yet — create a new one.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            placeholder="Institution name (e.g. Chase)"
            value={institutionName}
            onChange={e => setInstitutionName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1535] text-sm focus:outline-none focus:border-[#4F3FF0]"
          />
          <input
            placeholder="Account name (e.g. Chase Checking)"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1535] text-sm focus:outline-none focus:border-[#4F3FF0]"
          />
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setAccountType(type)}
                className={`px-3 py-2 rounded-lg text-sm text-center transition-colors ${
                  accountType === type
                    ? 'bg-[#4F3FF0] text-white'
                    : 'bg-gray-100 text-[#4B5563] hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={mode === 'existing' ? !selectedId : !institutionName || !accountName}
        className="w-full py-3 bg-[#4F3FF0] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7B6FF5] transition-colors"
      >
        Continue
      </button>
    </div>
  )
}
