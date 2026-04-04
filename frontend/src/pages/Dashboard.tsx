import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import DonutChart from '../components/charts/DonutChart'
import CategoryBarChart from '../components/charts/CategoryBarChart'
import AreaChart from '../components/charts/AreaChart'
import SpendingLineChart from '../components/charts/SpendingLineChart'
import { getDashboard, getAppStatus } from '../lib/api'

type Period = '30d' | '3m' | 'this_month' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  '30d': 'Last 30 days',
  '3m': 'Last 3 months',
  'this_month': 'This month',
  'all': 'All time',
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState<'donut' | 'bar'>('donut')
  const [uploadOpen, setUploadOpen] = useState(false)
  const navigate = useNavigate()

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

  if (loading || !data) {
    return (
      <>
        <TopNav onUploadClick={() => setUploadOpen(true)} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav onUploadClick={() => setUploadOpen(true)} />

      {uploadOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 text-center space-y-3">
            <p className="font-medium text-gray-800">Upload modal coming in Step 7</p>
            <button onClick={() => setUploadOpen(false)} className="text-sm text-blue-600">Close</button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">${data.total_spent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h1>
            <p className="text-gray-400 text-sm mt-1">total spent · {PERIOD_LABELS[period]}</p>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Category chart with toggle */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Spending by category</h2>
            <button
              onClick={() => setChartMode(m => m === 'donut' ? 'bar' : 'donut')}
              className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1 hover:text-gray-600 transition-colors"
            >
              {chartMode === 'donut' ? 'Bar chart' : 'Donut chart'}
            </button>
          </div>
          {data.categories_current.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No spending data for this period</p>
          ) : chartMode === 'donut' ? (
            <DonutChart data={data.categories_current} previousData={data.categories_previous} />
          ) : (
            <CategoryBarChart data={data.categories_current} previousData={data.categories_previous} />
          )}
        </div>

        {/* Income vs Expenses */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Income vs. Expenses</h2>
          {data.area_chart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
          ) : (
            <AreaChart data={data.area_chart} />
          )}
        </div>

        {/* Spending over time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Spending over time</h2>
          {data.line_chart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
          ) : (
            <SpendingLineChart data={data.line_chart} />
          )}
        </div>
      </main>
    </>
  )
}
