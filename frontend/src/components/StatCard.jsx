export default function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-500/20 to-brand-700/20 border-brand-500/20 text-brand-400',
    green: 'from-emerald-500/20 to-emerald-700/20 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-700/20 border-blue-500/20 text-blue-400',
    amber: 'from-amber-500/20 to-amber-700/20 border-amber-500/20 text-amber-400',
  }

  return (
    <div className={`glass rounded-2xl p-5 border bg-gradient-to-br ${colors[color]} glass-hover animate-slide-up`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          {Icon && <Icon size={20} className={colors[color].split(' ').find(c => c.startsWith('text-'))} />}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value ?? '—'}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}
