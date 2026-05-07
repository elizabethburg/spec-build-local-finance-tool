import { formatCurrency } from '../../lib/format'
import { CATEGORY_COLORS } from '../../design/tokens'

interface CategoryBarsProps {
  current: { name: string; amount: number; percent: number }[]
  previous: { name: string; amount: number }[]
}

export function CategoryBars({ current, previous }: CategoryBarsProps) {
  if (current.length === 0) {
    return <div className="text-[#94A3B8] text-sm py-4">No spending data for this period</div>
  }

  const prevMap = Object.fromEntries(previous.map(p => [p.name, p.amount]))
  const max = Math.max(...current.map(c => c.amount))

  return (
    <div className="space-y-3">
      {current.slice(0, 8).map(cat => {
        const color = CATEGORY_COLORS[cat.name] || '#CBD5E1'
        const prev = prevMap[cat.name] || 0
        const barWidth = (cat.amount / max) * 100

        return (
          <div key={cat.name}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[#4B5563]">{cat.name}</span>
              <div className="flex items-center gap-3 text-sm">
                {prev > 0 && (
                  <span className="text-[#94A3B8] text-xs">{formatCurrency(prev)}</span>
                )}
                <span className="font-medium text-[#1A1535] tabular-nums">{formatCurrency(cat.amount)}</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
