import { useState, useEffect } from 'react'
import { Share2, Globe, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'

const COLORS = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#a78bfa', '#8b5cf6', '#c4b5fd', '#ddd6fe']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-brand-500/20">
      <p className="text-xs text-slate-400 mb-1">{payload[0].name}</p>
      <p className="text-lg font-bold text-brand-400">{payload[0].value} visits</p>
    </div>
  )
}

export default function Referrers() {
  const [referrers, setReferrers] = useState([])
  const [apps, setApps] = useState([])
  const [appId, setAppId] = useState('')
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/apps/').then((r) => {
      setApps(r.data)
      if (r.data.length) setAppId(String(r.data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!appId) return
    setLoading(true)
    api
      .get('/analytics/top-referrers/', { params: { app_id: appId, limit } })
      .then((r) => setReferrers(r.data))
      .catch(() => setReferrers([]))
      .finally(() => setLoading(false))
  }, [appId, limit])

  const pieData = referrers.map((r) => ({ name: r.referrer || 'Direct', value: r.count }))
  const total = referrers.reduce((s, r) => s + r.count, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Referrers</h1>
          <p className="text-slate-400 text-sm mt-1">Where your traffic is coming from</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="glass border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
          >
            {[5, 10, 25].map((n) => (
              <option key={n} value={n} style={{ background: '#0d0d1f' }}>Top {n}</option>
            ))}
          </select>
          {apps.length > 0 && (
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="glass border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0d0d1f' }}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 flex flex-col">
          <h2 className="text-base font-semibold text-white mb-4">Traffic Sources</h2>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Globe size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No referrer data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {!loading && total > 0 && (
            <p className="text-center text-sm text-slate-400 mt-2">{total.toLocaleString()} total visits</p>
          )}
        </div>

        {/* Table */}
        <div className="lg:col-span-3 glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Source Breakdown</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : referrers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <Share2 size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No referrer data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrers.map((r, i) => {
                const pct = total ? Math.round((r.count / total) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-slate-200 truncate">{r.referrer || 'Direct / None'}</p>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0">{r.count.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
