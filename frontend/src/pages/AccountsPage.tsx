import { useAccounts } from '../hooks/useAccounts'
import { Card } from '../components/ui/Card'
import { AccountTypeBadge } from '../components/ui/Badge'
import { formatCurrency } from '../lib/format'
import { useQuery } from '@tanstack/react-query'
import { api, Account } from '../lib/api'

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()

  const assets = accounts?.filter(a => a.account_class === 'ASSET') || []
  const liabilities = accounts?.filter(a => a.account_class === 'LIABILITY') || []

  if (isLoading) return <div className="text-[#94A3B8] p-6">Loading accounts...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#1A1535]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Accounts
      </h1>

      <AccountGroup title="ASSETS" accounts={assets} />
      <AccountGroup title="LIABILITIES" accounts={liabilities} />

      {accounts && accounts.length === 0 && (
        <Card>
          <p className="text-[#94A3B8] text-sm text-center py-4">
            No accounts yet. Upload a statement to get started.
          </p>
        </Card>
      )}
    </div>
  )
}

function AccountGroup({ title, accounts }: { title: string; accounts: Account[] }) {
  if (accounts.length === 0) return null

  return (
    <div>
      <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-3">{title}</p>
      <div className="space-y-3">
        {accounts.map(acct => (
          <AccountCard key={acct.id} account={acct} />
        ))}
      </div>
    </div>
  )
}

function AccountCard({ account }: { account: Account }) {
  const { data: balData } = useQuery({
    queryKey: ['account-balance', account.id],
    queryFn: () => api.getAccountBalance(account.id),
    staleTime: 30_000,
  })

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAE8FD] flex items-center justify-center text-[#4F3FF0] font-semibold text-sm">
            {account.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-[#1A1535]">{account.name}</p>
            <p className="text-xs text-[#94A3B8]">{account.institution?.name_display}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#1A1535] tabular-nums">
            {balData ? formatCurrency(balData.balance) : '—'}
          </p>
          <AccountTypeBadge type={account.type} />
        </div>
      </div>
    </Card>
  )
}
