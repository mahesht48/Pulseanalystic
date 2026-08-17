import { useState, useEffect } from 'react'
import { Download, FileText, CheckCircle } from 'lucide-react'
import api from '../services/api'

export default function Export() {
  const [apps, setApps] = useState([])
  const [appId, setAppId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/apps/').then((r) => {
      setApps(r.data)
      if (r.data.length) setAppId(String(r.data[0].id))
    })
    const now = new Date()
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
    setEndDate(now.toISOString().slice(0, 10))
    setStartDate(thirtyDaysAgo.toISOString().slice(0, 10))
  }, [])

  const handleExport = async () => {
    if (!appId) return
    setLoading(true)
    setSuccess(false)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      const response = await fetch(
        `${base}/analytics/export/?${params}`,
        { credentials: 'include' }
      )

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `events_${appId}_${startDate}_${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-slate-400 text-sm mt-1">Download your analytics events as CSV</p>
      </div>

      <div className="glass rounded-2xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* App selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Application
            </label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full glass border border-white/10 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50"
            >
              {apps.map((a) => (
                <option key={a.id} value={a.id} style={{ background: '#0d0d1f' }}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full glass border border-white/10 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full glass border border-white/10 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-brand-600/10 border border-brand-500/20 mb-8">
          <FileText size={18} className="text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-brand-300 font-medium mb-1">CSV Export</p>
            <p className="text-xs text-slate-400">
              Exports all events for the selected app and date range. Large exports are streamed
              server-side and won't time out. Includes: event type, page, referrer, user ID, and timestamp.
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || !appId}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all duration-200 glow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Preparing export…
            </>
          ) : success ? (
            <>
              <CheckCircle size={18} />
              Downloaded!
            </>
          ) : (
            <>
              <Download size={18} />
              Download CSV
            </>
          )}
        </button>
      </div>

      {/* Format info */}
      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">CSV Format</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['id', 'event', 'page', 'referrer', 'user_id', 'timestamp'].map((col) => (
                  <th key={col} className="pb-3 pr-4 text-left text-slate-400 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {['42', 'pageview', '/pricing', 'https://google.com', 'usr_abc123', '2024-01-15T10:30:00Z'].map((val, i) => (
                  <td key={i} className="pt-3 pr-4 text-slate-500 font-mono">{val}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
