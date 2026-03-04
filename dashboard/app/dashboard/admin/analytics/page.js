'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getSupabase } from '../../../../lib/supabase'
import { api } from '../../../../lib/api'
import { format } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs font-mono">
      <div className="text-knight-muted mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value?.toLocaleString()}</div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [token, setToken] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.admin.overview(session.access_token)
        setData(res)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const snapshots = (data?.snapshots || [])
    .slice()
    .reverse()
    .map(s => ({
      ...s,
      date: format(new Date(s.snapshot_date), 'MMM d'),
    }))

  const stats = data?.overview

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 animate-slide-up">
        <div className="inline-flex items-center gap-2 bg-yellow-400 bg-opacity-10 border border-yellow-400 border-opacity-30 px-3 py-1 rounded-full mb-3">
          <span className="text-yellow-400 text-xs font-mono uppercase tracking-wider">⚡ Admin Panel</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">Analytics</h1>
        <p className="text-knight-muted text-sm mt-1">Historical system metrics & trends</p>
      </div>

      {loading ? (
        <div className="text-knight-muted font-mono text-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
          Loading analytics...
        </div>
      ) : (
        <>
          {/* Current stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats?.totalUsers || 0, color: '#6c47ff' },
              { label: 'Active Now', value: stats?.activeSessions || 0, color: '#00ff88' },
              { label: 'Total Messages', value: (stats?.totalMessages || 0).toLocaleString(), color: '#64a0ff' },
              { label: 'Runtime Hours', value: (stats?.totalRuntimeHours || 0).toLocaleString(), color: '#ffcc00' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4" style={{ borderColor: `${s.color}22` }}>
                <div className="font-display text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-knight-muted font-mono uppercase tracking-wider mt-1">{s.label}</div>
                <div className="mt-2 h-0.5 rounded-full" style={{ background: s.color, opacity: 0.4 }} />
              </div>
            ))}
          </div>

          {snapshots.length > 0 ? (
            <>
              {/* Users & Active Sessions chart */}
              <div className="glass-card p-5 mb-5">
                <h3 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted mb-5">
                  Users & Active Sessions (Daily)
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={snapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,71,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 11 }} />
                    <Line type="monotone" dataKey="total_users" stroke="#6c47ff" strokeWidth={2} dot={false} name="Total Users" />
                    <Line type="monotone" dataKey="active_sessions" stroke="#00ff88" strokeWidth={2} dot={false} name="Active Sessions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Messages chart */}
              <div className="glass-card p-5 mb-5">
                <h3 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted mb-5">
                  Total Messages Processed
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={snapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,71,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total_messages" fill="#6c47ff" fillOpacity={0.7} name="Messages" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Runtime chart */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted mb-5">
                  Total Runtime Hours
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={snapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,71,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fill: '#6666aa', fontSize: 11, fontFamily: 'monospace' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total_runtime_hours" stroke="#ffcc00" strokeWidth={2} dot={false} name="Runtime Hours" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="glass-card p-10 text-center">
              <div className="text-4xl mb-3 opacity-30">📊</div>
              <p className="text-knight-muted font-mono text-sm">No historical data yet.</p>
              <p className="text-knight-muted font-mono text-xs mt-1">Daily snapshots are saved automatically at midnight.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
