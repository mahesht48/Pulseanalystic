import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Plus, Trash2, Copy, Check, Key, RefreshCw } from 'lucide-react'
import api from '../services/api'

function ApiKeyRow({ app, onDelete, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [newKey, setNewKey] = useState(null)

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await api.post(`/apps/${app.id}/regenerate-key/`)
      setNewKey(res.data.api_key)
      onRegenerate()
    } finally {
      setRegenerating(false)
    }
  }

  const displayKey = newKey || app.api_key

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">{app.name}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${
            app.scope === 'write'
              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/20'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
          }`}>
            {app.scope} scope
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all"
            title="Regenerate API key"
          >
            <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => onDelete(app.id)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete app"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {displayKey ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-slate-400 font-mono bg-black/30 rounded-lg px-3 py-2 truncate">
            {displayKey}
          </code>
          <button
            onClick={() => copy(displayKey)}
            className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all shrink-0"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-slate-600 font-mono bg-black/30 rounded-lg px-3 py-2">
            ••••••••••••••••••••••••••••••••
          </code>
          <p className="text-xs text-slate-500">Key hidden — regenerate to reveal</p>
        </div>
      )}

      {newKey && (
        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
          <Key size={12} /> Save this key — it won't be shown again.
        </p>
      )}
    </div>
  )
}

export default function Settings() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newApp, setNewApp] = useState({ name: '', scope: 'write' })
  const [showForm, setShowForm] = useState(false)
  const [createdKey, setCreatedKey] = useState(null)

  const fetchApps = () => {
    setLoading(true)
    api.get('/apps/').then((r) => setApps(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchApps() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/apps/', newApp)
      setCreatedKey({ name: res.data.name, key: res.data.api_key })
      setNewApp({ name: '', scope: 'write' })
      setShowForm(false)
      fetchApps()
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this app and all its data?')) return
    await api.delete(`/apps/${id}/`)
    fetchApps()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your apps and API keys</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white text-sm font-semibold hover:from-brand-500 hover:to-brand-400 transition-all glow-sm"
        >
          <Plus size={16} />
          New App
        </button>
      </div>

      {/* New app form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6 animate-slide-up">
          <h2 className="text-base font-semibold text-white mb-4">Register New App</h2>
          <form onSubmit={handleCreate} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">App Name</label>
              <input
                value={newApp.name}
                onChange={(e) => setNewApp((f) => ({ ...f, name: e.target.value }))}
                className="w-full glass border border-white/10 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500/50"
                placeholder="My Website"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Scope</label>
              <select
                value={newApp.scope}
                onChange={(e) => setNewApp((f) => ({ ...f, scope: e.target.value }))}
                className="glass border border-white/10 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none"
              >
                <option value="write" style={{ background: '#0d0d1f' }}>Write</option>
                <option value="read" style={{ background: '#0d0d1f' }}>Read</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-500 transition-all disabled:opacity-50"
            >
              {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div className="glass rounded-2xl p-5 mb-6 border border-emerald-500/30 bg-emerald-500/5 animate-slide-up">
          <div className="flex items-start gap-3">
            <Key size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-400 mb-1">{createdKey.name} — API Key Created</p>
              <code className="text-xs text-slate-300 font-mono break-all">{createdKey.key}</code>
              <p className="text-xs text-amber-400 mt-2">Copy this now — it won't be shown again.</p>
            </div>
            <button onClick={() => setCreatedKey(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* App list */}
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <RefreshCw size={24} className="text-brand-400 animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <SettingsIcon size={40} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-sm">No apps yet. Create one to get your API key.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <ApiKeyRow key={app.id} app={app} onDelete={handleDelete} onRegenerate={fetchApps} />
          ))}
        </div>
      )}

      {/* Tracker snippet */}
      {apps.length > 0 && (
        <div className="mt-8 glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-1">Add Tracker to Your Site</h2>
          <p className="text-xs text-slate-500 mb-4">Paste this before the closing &lt;/body&gt; tag</p>
          <pre className="text-xs text-slate-300 bg-black/40 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">
{`<script
  src="${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}/static/tracker.js"
  data-key="YOUR_API_KEY"
  defer
></script>`}
          </pre>
        </div>
      )}
    </div>
  )
}
