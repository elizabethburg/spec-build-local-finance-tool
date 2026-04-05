import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'

interface DayCashflow {
  date: string
  income: number
  expenses: number
  by_category?: Record<string, number>
}

interface RhythmChartProps {
  dailyCashflow: DayCashflow[]
  hoveredCategory: string | null
}

/** Normalize display units: both income and expenses fill their own half */
const MAX_HALF = 1000

const isMonday = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() === 1
}

const fmtAxis = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 1000) return `$${(abs / 1000).toFixed(0)}k`
  if (abs >= 100) return `$${Math.round(abs)}`
  return `$${abs.toFixed(0)}`
}

/** Custom expense bar — reads fillOpacity from datum */
const ExpenseBar = (props: any) => {
  const { x, y, width, height, fillOpacity = 1 } = props
  if (!width || !height) return null
  const top = height < 0 ? y + height : y
  const h = Math.abs(height)
  if (h < 0.5) return null
  return (
    <rect x={x} y={top} width={width} height={h}
      fill="#C8544B" fillOpacity={fillOpacity} rx={2} />
  )
}

const IncomeBar = (props: any) => {
  const { x, y, width, height } = props
  if (!width || !height) return null
  const top = height < 0 ? y + height : y
  const h = Math.abs(height)
  if (h < 0.5) return null
  return <rect x={x} y={top} width={width} height={h} fill="#7EB345" fillOpacity={0.85} rx={2} />
}

function CustomTooltip({ active, payload, hoveredCategory, maxInc, maxExp }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  const [y, m, d] = item.date.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs space-y-1 min-w-[160px]">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {item.income > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-sage font-medium">Income</span>
          <span>${item.income.toFixed(2)}</span>
        </div>
      )}
      {item.expenses > 0 && !hoveredCategory && (
        <div className="flex justify-between gap-4">
          <span className="text-clay font-medium">Expenses</span>
          <span>${item.expenses.toFixed(2)}</span>
        </div>
      )}
      {hoveredCategory && (
        <div className="flex justify-between gap-4">
          <span className="text-clay font-medium">{hoveredCategory}</span>
          <span>${(item.by_category?.[hoveredCategory] ?? 0).toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

export default function RhythmChart({ dailyCashflow, hoveredCategory }: RhythmChartProps) {
  if (!dailyCashflow.length) return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">
      No data for this period
    </div>
  )

  const maxInc = Math.max(...dailyCashflow.map(d => d.income), 1)
  const maxExp = Math.max(...dailyCashflow.map(d => d.expenses), 1)

  const chartData = dailyCashflow.map(d => ({
    date: d.date,
    income: d.income,
    expenses: d.expenses,
    by_category: d.by_category ?? {},
    incomeDisplay: (d.income / maxInc) * MAX_HALF,
    expenseDisplay: d.expenses > 0 ? -(d.expenses / maxExp) * MAX_HALF : 0,
    fillOpacity: hoveredCategory
      ? ((d.by_category?.[hoveredCategory] ?? 0) > 0 ? 1 : 0.12)
      : 1,
  }))

  // Y-axis ticks at 0%, 50%, 100% of each half, in normalized units
  const ticks = [-MAX_HALF, -MAX_HALF / 2, 0, MAX_HALF / 2, MAX_HALF]
  const tickFormatter = (val: number) => {
    if (val === 0) return '$0'
    if (val > 0) return fmtAxis((val / MAX_HALF) * maxInc)
    return fmtAxis((-val / MAX_HALF) * maxExp)
  }

  // Average ± 1σ for expense bars
  const expValues = dailyCashflow.map(d => d.expenses).filter(v => v > 0)
  const avgExp = expValues.length
    ? expValues.reduce((a, b) => a + b, 0) / expValues.length : 0
  const stdExp = expValues.length
    ? Math.sqrt(expValues.reduce((a, b) => a + Math.pow(b - avgExp, 2), 0) / expValues.length)
    : 0
  const avgDisplay = avgExp > 0 ? -(avgExp / maxExp) * MAX_HALF : 0
  const bandTop = Math.min(0, -((Math.max(avgExp - stdExp, 0)) / maxExp) * MAX_HALF)
  const bandBottom = -((avgExp + stdExp) / maxExp) * MAX_HALF

  const mondayDates = chartData.filter(d => isMonday(d.date)).map(d => d.date)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} barCategoryGap="25%" barGap={1}>
        <XAxis
          dataKey="date"
          ticks={mondayDates.length > 0 ? mondayDates : undefined}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={d => {
            const [, m, day] = d.split('-')
            return `${parseInt(m)}/${parseInt(day)}`
          }}
        />
        <YAxis
          domain={[-MAX_HALF, MAX_HALF]}
          ticks={ticks}
          tickFormatter={tickFormatter}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          width={44}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip hoveredCategory={hoveredCategory} maxInc={maxInc} maxExp={maxExp} />}
          cursor={{ fill: '#f3f4f6', opacity: 0.6 }}
        />

        {/* Zero baseline */}
        <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />

        {/* Avg expense ± 1σ band */}
        {avgExp > 0 && (
          <>
            <ReferenceArea
              y1={bandTop} y2={bandBottom}
              fill="#9ca3af" fillOpacity={0.08} strokeOpacity={0}
            />
            <ReferenceLine
              y={avgDisplay}
              stroke="#9ca3af" strokeDasharray="4 3" strokeWidth={1}
              label={{ value: 'avg', position: 'insideRight', fontSize: 9, fill: '#9ca3af', dy: -6 }}
            />
          </>
        )}

        <Bar dataKey="incomeDisplay" shape={<IncomeBar />} maxBarSize={16} />
        <Bar dataKey="expenseDisplay" shape={<ExpenseBar />} maxBarSize={16} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
