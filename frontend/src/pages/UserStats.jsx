import { useState } from 'react'
import { Users, Search, Monitor, Globe, Activity } from 'lucide-react'
import api from '../services/api'

export default function UserStats() {
  const [userId, setUserId] = useState('')
  const [input, setInput] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setStats(null)
    try {
      const res = await api.get('/analytics/user-stats/', { params: { userId: input.trim() } })
      setStats(res.data)
      setUserId(input.trim())
    } catch (err) {
      setError(err.response?.data?.detail || 'User not found or no data available.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">User Stats</h1>
        <p className="text-slate-400 text-sm mt-1">Look up analytics data for a specific user ID</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="glass rounded-2xl p-6 mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          User ID
        </label>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 glass border border-white/10 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-all"
            placeholder="e.g. user_abc123"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold text-sm hover:from-brand-500 hover:to-brand-400 transition-all glow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Search size={16} /> Look Up</>
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {stats && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/20 flex items-center justify-center">
                <Users size={24} className="text-brand-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{userId}</p>
                <p className="text-sm text-slate-400">User profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-4 text-center">
                <Activity size={20} className="text-brand-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats.totalEvents?.toLocaleString() ?? '0'}</p>
                <p className="text-xs text-slate-500 mt-1">Total Events</p>
              </div>

              <div className="glass rounded-xl p-4 text-center">
                <Monitor size={20} className="text-blue-400 mx-auto mb-2" />
                <div>
                  <p className="text-sm font-semibold text-white">{stats.deviceDetails?.browser || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stats.deviceDetails?.os || '—'}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">Device</p>
              </div>

              <div className="glass rounded-xl p-4 text-center">
                <Globe size={20} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-mono text-white">{stats.ipAddress || '—'}</p>
                <p className="text-xs text-slate-500 mt-1">Last IP</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!stats && !error && !loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Users size={40} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-sm">Enter a user ID above to look up their analytics data.</p>
        </div>
      )}
    </div>
  )
}
