import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency, formatShortDate } from '../../lib/format'

interface NetWorthChartProps {
  data: { date: string; net_worth: number }[]
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-[#94A3B8] text-sm">No history yet</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F0FE" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatCurrency(v)}
          tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter' }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(v: number) => [formatCurrency(v), 'Net Worth']}
          labelFormatter={formatShortDate}
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Inter' }}
        />
        <Line
          type="monotone"
          dataKey="net_worth"
          stroke="#4F3FF0"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#4F3FF0' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
