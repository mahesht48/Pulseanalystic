import { useState, useEffect } from 'react'
import { FileText, ExternalLink, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-brand-500/20">
      <p className="text-xs text-slate-400 mb-1 truncate max-w-[200px]">{payload[0]?.payload?.url}</p>
      <p className="text-lg font-bold text-brand-400">{payload[0].value} views</p>
    </div>
  )
}

export default function TopPages() {
  const [pages, setPages] = useState([])
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
      .get('/analytics/top-pages/', { params: { limit } })
      .then((r) => setPages(r.data))
      .catch(() => setPages([]))
      .finally(() => setLoading(false))
  }, [appId, limit])

  const max = pages.length ? pages[0].views : 1

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Top Pages</h1>
          <p className="text-slate-400 text-sm mt-1">Most visited pages across your apps</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="glass border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none"
          >
            {[5, 10, 25, 50].map((n) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Views Distribution</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={pages.slice(0, 10).map((p) => ({ ...p, label: p.url?.split('/').filter(Boolean).slice(-1)[0] || '/' }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Table */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Rankings</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : pages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500">
              <FileText size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No page data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((p, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span className="text-xs font-mono text-slate-600 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-sm text-slate-200 truncate">{p.url}</p>
                      <ExternalLink size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-700"
                        style={{ width: `${(p.views / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-400 shrink-0">{p.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
