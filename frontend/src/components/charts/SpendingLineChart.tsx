import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SpendingLineChartProps {
  data: { date: string; amount: number }[]
}

export default function SpendingLineChart({ data }: SpendingLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spending']} />
        <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
