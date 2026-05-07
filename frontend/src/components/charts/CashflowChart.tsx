import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency, formatShortDate } from '../../lib/format'

interface CashflowChartProps {
  data: { date: string; income: number; expenses: number }[]
}

export function CashflowChart({ data }: CashflowChartProps) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-[#94A3B8] text-sm">No cashflow data yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2ECC8F" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2ECC8F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F06B6B" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#F06B6B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F0FE" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatCurrency(v)}
          tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }}
          axisLine={false} tickLine={false} width={70}
        />
        <Tooltip
          formatter={(v: number, name: string) => [formatCurrency(v), name === 'income' ? 'Income' : 'Expenses']}
          labelFormatter={formatShortDate}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Inter' }}
        />
        <Area type="monotone" dataKey="income" stroke="#2ECC8F" fill="url(#incomeGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" stroke="#F06B6B" fill="url(#expenseGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
