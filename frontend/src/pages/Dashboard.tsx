import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import InsightPopup from '../components/InsightPopup'
import RhythmChart from '../components/charts/RhythmChart'
import CulpritsList from '../components/CulpritsList'
import UploadModal from '../components/UploadModal'
import { getDashboard, getAppStatus } from '../lib/api'

type Period = '30d' | '3m' | 'this_month' | 'same_month_ly' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  '30d':           'Last 30 days',
  '3m':            'Last 3 months',
  'this_month':    'This month',
  'same_month_ly': 'Same month last year',
  'all':           'All time',
}

const fmt = (v: number) =>
  `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Measure sticky header height so Rhythm chart can stick below it
  useEffect(() => {
    if (!headerRef.current) return
    const obs = new ResizeObserver(() => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 0)
    })
    obs.observe(headerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    getAppStatus().then(({ has_transactions }) => {
      if (!has_transactions) navigate('/upload')
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    getDashboard(period).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [period])

  const net = data ? data.total_income - data.total_spent : 0
  const expensePct = data && data.total_income > 0
    ? Math.min((data.total_spent / data.total_income) * 100, 100)
    : 0

  return (
    <>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}

      {/* ─── Sticky header: nav + pulse ─── */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <TopNav onUploadClick={() => setUploadOpen(true)} />

        <div className="max-w-5xl mx-auto px-6 py-4 space-y-3">
          {/* KPIs + period selector */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            {data ? (
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Income</p>
                  <p className="text-2xl font-bold text-sage tabular-nums">{fmt(data.total_income)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Expenses</p>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(data.total_spent)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Net</p>
                  <p className={`text-2xl font-bold tabular-nums ${net >= 0 ? 'text-sage' : 'text-clay'}`}>
                    {net >= 0 ? '+' : '-'}{fmt(net)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-8">
                {['Income', 'Expenses', 'Net'].map(k => (
                  <div key={k}>
                    <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Expenses % progress bar */}
          {data && (
            <div className="space-y-0.5">
              {/* Floating % label above fill endpoint */}
              <div className="relative h-4">
                <span
                  className="absolute text-xs font-semibold text-gray-600 -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${Math.min(expensePct, 96)}%` }}
                >
                  {expensePct.toFixed(0)}%
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    expensePct > 90 ? 'bg-clay' : expensePct > 70 ? 'bg-ochre' : 'bg-sage'
                  }`}
                  style={{ width: `${expensePct}%` }}
                />
                {/* 50% benchmark tick */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-400 rounded-full z-10"
                  style={{ left: '50%' }}
                />
              </div>

              {/* Floor / ceiling labels */}
              <div className="flex justify-between text-xs text-gray-400 pt-0.5">
                <span>$0</span>
                <span className="text-gray-300 text-xs">50%</span>
                <span>{fmt(data.total_income)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Scrollable content ─── */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Rhythm — sticky below header while culprits scroll */}
        <div
          className="bg-white rounded-xl border border-gray-200 p-5 z-20"
          style={{ position: 'sticky', top: headerHeight + 16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Daily cash flow</h2>
            <div className="flex gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block bg-sage" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block bg-clay" />
                {hoveredCategory ?? 'Expenses'}
              </span>
            </div>
          </div>
          <div style={{ height: 'calc(40vh - 5rem)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-dusk border-t-transparent rounded-full" />
              </div>
            ) : (
              <RhythmChart
                dailyCashflow={data?.daily_cashflow ?? []}
                hoveredCategory={hoveredCategory}
              />
            )}
          </div>
        </div>

        {/* Culprits — scrolls behind the sticky chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Where it went</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <CulpritsList
              categories={data?.categories_current ?? []}
              previousCategories={data?.categories_previous ?? null}
              total={data?.total_spent ?? 0}
              hoveredCategory={hoveredCategory}
              onHover={setHoveredCategory}
            />
          )}
        </div>
      </main>

      <InsightPopup />
    </>
  )
}
