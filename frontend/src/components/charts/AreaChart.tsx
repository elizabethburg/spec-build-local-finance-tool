import { AreaChart as ReAreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AreaChartProps {
  data: { month: string; income: number; expenses: number }[]
}

export default function AreaChart({ data }: AreaChartProps) {
  const totalIncome = data.reduce((s, d) => s + d.income, 0)
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0)
  const net = totalIncome - totalExpenses

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <ReAreaChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
          <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#dcfce7" />
          <Area type="monotone" dataKey="expenses" stackId="1" stroke="#3b82f6" fill="#dbeafe" />
        </ReAreaChart>
      </ResponsiveContainer>
      <div className="flex justify-around text-center text-sm">
        <div>
          <p className="text-gray-400 text-xs">Income</p>
          <p className="font-semibold text-green-600">${totalIncome.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Expenses</p>
          <p className="font-semibold text-blue-600">${totalExpenses.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Net</p>
          <p className={`font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {net >= 0 ? '+' : ''}${net.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}
