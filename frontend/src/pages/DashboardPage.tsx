import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import { Card } from '../components/ui/Card'
import { NetWorthChart } from '../components/charts/NetWorthChart'
import { CashflowChart } from '../components/charts/CashflowChart'
import { CategoryBars } from '../components/charts/CategoryBars'
import { InsightMoment } from '../components/insights/InsightMoment'
import { StatusBanner } from '../components/ui/StatusBanner'
import { formatCurrency } from '../lib/format'

const PERIODS = [
  { key: 'this_month', label: 'This month' },
  { key: '30d', label: '30 days' },
  { key: '3m', label: '3 months' },
  { key: 'all', label: 'All time' },
]

export function DashboardPage() {
  const [period, setPeriod] = useState('this_month')
  const { data, isLoading, error } = useDashboard(period)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-[#94A3B8]">Loading your financial picture...</div>
  )

  if (error) return (
    <div className="p-6">
      <StatusBanner message="Couldn't load your dashboard. Make sure the backend is running." type="error" />
    </div>
  )

  if (!data) return null

  const nw = data.net_worth
  const nwColor = nw >= 0 ? '#4F3FF0' : '#F06B6B'
  const delta = data.net_worth_delta

  return (
    <div className="space-y-6">
      <StatusBanner />

      {/* Hero */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">Net Worth</p>
            <div
              className="text-[72px] font-semibold leading-none tabular-nums"
              style={{ color: nwColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {formatCurrency(nw)}
            </div>
            {delta !== null && delta !== undefined && (
              <p className={`text-sm mt-2 font-medium ${delta >= 0 ? 'text-[#2ECC8F]' : 'text-[#F06B6B]'}`}>
                {delta >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(delta))} from last period
              </p>
            )}
          </div>

          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p.key ? 'bg-[#4F3FF0] text-white' : 'text-[#94A3B8] hover:text-[#4B5563]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Account summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.accounts.map(acct => (
          <Card key={acct.id} padding="sm">
            <p className="text-xs text-[#94A3B8] truncate">{acct.name}</p>
            <p className={`text-lg font-semibold tabular-nums mt-1 ${acct.balance < 0 ? 'text-[#F06B6B]' : 'text-[#1A1535]'}`}>
              {formatCurrency(Math.abs(acct.balance))}
            </p>
            <p className="text-xs text-[#94A3B8] mt-0.5">{acct.type.replace('_', ' ')}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Net Worth Over Time</p>
          <NetWorthChart data={data.net_worth_history} />
        </Card>
        <Card>
          <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Cashflow</p>
          <CashflowChart data={data.daily_cashflow} />
        </Card>
      </div>

      {/* Spending categories */}
      <Card>
        <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-4">Where It Went</p>
        <CategoryBars current={data.categories_current} previous={data.categories_previous} />
      </Card>

      {/* Insight */}
      {data.insight && (
        <InsightMoment text={data.insight.text} />
      )}
    </div>
  )
}
