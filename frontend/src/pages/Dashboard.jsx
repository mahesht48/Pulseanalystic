import { useState, useEffect } from 'react'
import { Activity, Eye, Users, TrendingUp, RefreshCw } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import api from '../services/api'
import StatCard from '../components/StatCard'

const GRANULARITIES = ['hour', 'day', 'week', 'month']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-brand-500/20">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-brand-400">{payload[0].value} events</p>
    </div>
  )
}

export default function Dashboard() {
  const [series, setSeries] = useState([])
  const [granularity, setGranularity] = useState('day')
  const [appId, setAppId] = useState('')
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    api.get('/apps/').then((r) => {
      setApps(r.data)
      if (r.data.length) setAppId(String(r.data[0].id))
    })
    api.get('/health/').then((r) => setHealth(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!appId) return
    setLoading(true)
    const now = new Date()
    const past = new Date(now)
    if (granularity === 'hour') past.setDate(now.getDate() - 2)
    else if (granularity === 'day') past.setDate(now.getDate() - 30)
    else if (granularity === 'week') past.setDate(now.getDate() - 90)
    else past.setMonth(now.getMonth() - 12)
    const fmt = (d) => d.toISOString().slice(0, 10)
    api
      .get('/analytics/time-series/', {
        params: { app_id: appId, interval: granularity, startDate: fmt(past), endDate: fmt(now) },
      })
      .then((r) => setSeries(r.data))
      .catch(() => setSeries([]))
      .finally(() => setLoading(false))
  }, [appId, granularity])

  const totalEvents = series.reduce((s, d) => s + d.count, 0)
  const peak = series.length ? Math.max(...series.map((d) => d.count)) : 0
  const avg = series.length ? Math.round(totalEvents / series.length) : 0

  const formatLabel = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
    if (granularity === 'hour') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (granularity === 'month') return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const chartData = series.map((d) => ({ ...d, label: formatLabel(d.date) }))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time analytics overview</p>
        </div>

        <div className="flex items-center gap-3">
          {health && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              health.status === 'ok'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {health.status === 'ok' ? 'Systems Online' : 'Degraded'}
            </div>
          )}

          {apps.length > 0 && (
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="glass border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500/50"
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0d0d1f' }}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Activity} label="Total Events" value={totalEvents.toLocaleString()} color="brand" />
        <StatCard icon={TrendingUp} label="Peak Events" value={peak.toLocaleString()} color="blue" />
        <StatCard icon={Eye} label="Avg per Period" value={avg.toLocaleString()} color="green" />
        <StatCard icon={Users} label="Apps Tracked" value={apps.length} color="amber" />
      </div>

      {/* Chart */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Events Over Time</h2>
            <p className="text-slate-500 text-xs mt-0.5">Grouped by {granularity}</p>
          </div>
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  granularity === g
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw size={24} className="text-brand-400 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <Activity size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#eventGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
