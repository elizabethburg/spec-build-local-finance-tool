import { categoryColor } from '../lib/categoryColors'

interface Category {
  name: string
  amount: number
}

interface CulpritsListProps {
  categories: Category[]
  previousCategories: Category[] | null
  total: number
  hoveredCategory: string | null
  onHover: (category: string | null) => void
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const increased = pct > 0
  const label = `${increased ? '+' : ''}${pct.toFixed(0)}%`
  return (
    <span
      className={`text-xs font-medium tabular-nums w-12 text-right flex-shrink-0 ${
        increased ? 'text-clay' : 'text-sage'
      }`}
    >
      {label}
    </span>
  )
}

export default function CulpritsList({
  categories,
  previousCategories,
  total,
  hoveredCategory,
  onHover,
}: CulpritsListProps) {
  if (!categories.length) return (
    <p className="text-sm text-gray-400 text-center py-6">No spending data for this period</p>
  )

  const sorted = [...categories].sort((a, b) => b.amount - a.amount)
  const threshold = total * 0.03

  const primary = sorted.filter(c => c.amount >= threshold)
  const other = sorted.filter(c => c.amount < threshold)
  const otherTotal = other.reduce((s, c) => s + c.amount, 0)

  const items: Category[] = otherTotal > 0
    ? [...primary, { name: 'Other', amount: otherTotal }]
    : primary

  const maxAmount = items[0]?.amount ?? 1

  // Build previous lookup
  const prevMap: Record<string, number> = {}
  if (previousCategories) {
    for (const c of previousCategories) prevMap[c.name] = c.amount
    if (otherTotal > 0) {
      // sum previous for "Other" bucket using same category names
      const otherPrev = other.reduce((s, c) => s + (prevMap[c.name] ?? 0), 0)
      prevMap['Other'] = otherPrev
    }
  }

  const maxPrev = previousCategories
    ? Math.max(...items.map(i => prevMap[i.name] ?? 0), 0)
    : 0

  // Ghost bar is relative to same scale as current bar (maxAmount)
  const ghostScale = maxPrev > maxAmount ? maxPrev : maxAmount

  return (
    <div className="space-y-1">
      {items.map(item => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0
        const barWidth = (item.amount / maxAmount) * 100
        const ghostWidth = previousCategories ? ((prevMap[item.name] ?? 0) / ghostScale) * 100 : 0
        const color = categoryColor(item.name)
        const isHovered = hoveredCategory === item.name
        const isDimmed = hoveredCategory !== null && !isHovered
        const prevAmount = prevMap[item.name] ?? 0

        return (
          <div
            key={item.name}
            onMouseEnter={() => onHover(item.name)}
            onMouseLeave={() => onHover(null)}
            className={`flex items-center gap-3 py-2 px-2 rounded-lg cursor-default select-none transition-opacity ${
              isDimmed ? 'opacity-20' : 'opacity-100'
            } ${isHovered ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
          >
            {/* Color swatch */}
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />

            {/* Category name */}
            <span className="text-sm text-gray-700 w-36 flex-shrink-0 truncate">{item.name}</span>

            {/* Stacked bar: ghost behind, current on top */}
            <div className="flex-1 relative h-2 bg-gray-100 rounded-full overflow-hidden">
              {/* Ghost bar (previous period) */}
              {ghostWidth > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${ghostWidth}%`, backgroundColor: color, opacity: 0.2 }}
                />
              )}
              {/* Current bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{ width: `${barWidth}%`, backgroundColor: color, opacity: isHovered ? 1 : 0.7 }}
              />
            </div>

            {/* Dollar amount */}
            <span className="text-sm font-medium text-gray-700 w-20 text-right flex-shrink-0 tabular-nums">
              ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>

            {/* % of total */}
            <span className="text-xs text-gray-400 w-9 text-right flex-shrink-0 tabular-nums">
              {pct.toFixed(0)}%
            </span>

            {/* Delta vs previous period */}
            {previousCategories && <Delta current={item.amount} previous={prevAmount} />}
          </div>
        )
      })}

      {/* Legend row when comparison data exists */}
      {previousCategories && (
        <div className="flex items-center gap-3 pt-2 px-2 text-xs text-gray-400">
          <span className="w-2.5" />
          <span className="w-36" />
          <div className="flex-1 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-1.5 rounded-full inline-block bg-gray-400 opacity-20" />
              Previous period
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-1.5 rounded-full inline-block bg-gray-500 opacity-70" />
              This period
            </span>
          </div>
          <span className="w-20" />
          <span className="w-9" />
          <span className="w-12 text-right">vs. prev.</span>
        </div>
      )}
    </div>
  )
}
