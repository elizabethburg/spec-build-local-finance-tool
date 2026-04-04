import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

interface CategoryBarChartProps {
  data: { name: string; amount: number }[]
  previousData?: { name: string; amount: number }[] | null
}

export default function CategoryBarChart({ data, previousData }: CategoryBarChartProps) {
  // Merge previous data as a comparison bar
  const merged = data.map((d, i) => {
    const prev = previousData?.find(p => p.name === d.name)
    return { ...d, previous: prev?.amount ?? 0, color: COLORS[i % COLORS.length] }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={merged} layout="vertical" margin={{ left: 16, right: 16 }}>
        <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
        {previousData && previousData.length > 0 && (
          <Bar dataKey="previous" opacity={0.25} radius={[0, 4, 4, 0]}>
            {merged.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        )}
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {merged.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
