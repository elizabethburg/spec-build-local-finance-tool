import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

interface DonutChartProps {
  data: { name: string; amount: number }[]
}

export default function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={65}
            dataKey="amount"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">${total.toFixed(0)}</p>
          <p className="text-xs text-gray-400">total</p>
        </div>
      </div>
    </div>
  )
}
