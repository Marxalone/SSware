'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '../../../lib/supabase'
import { api } from '../../../lib/api'
import { useAdminSocket } from '../../../lib/useSocket'

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="glass-card p-5" style={{ borderColor: `rgba(${color}, 0.2)` }}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="font-display text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-knight-muted font-mono uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-xs text-knight-muted mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState(null)
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stopAllLoading, setStopAllLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const { botUpdates } = useAdminSocket(token)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)

      try {
        const data = await api.admin.overview(session.access_token)
        setOverview(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  function showMessage(text, type = 'info') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  async function handleStopAll() {
    if (!confirm('Stop ALL running bots? This will disconnect all users.')) return
    setStopAllLoading(true)
    try {
      const data = await api.admin.stopAll(token)
      showMessage(`Stopped ${data.stopped} bot(s).`, 'success')
      // Refresh
      const fresh = await api.admin.overview(token)
      setOverview(fresh)
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setStopAllLoading(false)
    }
  }

  async function handleBotAction(userId, action) {
    try {
      if (action === 'stop') await api.admin.stopBot(token, userId)
      else await api.admin.restartBot(token, userId)
      showMessage(`Bot ${action}ped.`, 'success')
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  function formatUptime(seconds) {
    if (!seconds) return '0s'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${seconds % 60}s`
  }

  const stats = overview?.overview
  const liveBots = overview?.liveBots || {}
  const liveIds = Object.keys(liveBots)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 animate-slide-up flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 bg-yellow-400 bg-opacity-10 border border-yellow-400 border-opacity-30 px-3 py-1 rounded-full mb-3">
            <span className="text-yellow-400 text-xs font-mono uppercase tracking-wider">⚡ Admin Panel</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">System Overview</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/admin/users" className="btn-primary py-2 px-5 rounded-lg text-sm">
            👥 Manage Users
          </Link>
          <button
            onClick={handleStopAll}
            disabled={stopAllLoading || liveIds.length === 0}
            className="btn-danger py-2 px-5 rounded-lg text-sm disabled:opacity-40"
          >
            {stopAllLoading ? '...' : '⏹ Stop All Bots'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-5 p-4 rounded-lg text-sm font-mono border animate-slide-up ${
          message.type === 'error' ? 'bg-red-950 border-knight-red border-opacity-40 text-knight-red' :
          'bg-green-950 border-green-500 border-opacity-30 text-knight-green'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-knight-muted font-mono text-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
          Loading system data...
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon="👥" label="Total Users" value={stats?.totalUsers || 0} color="108,71,255" />
            <StatCard icon="🟢" label="Active Bots" value={stats?.activeSessions || 0} color="0,255,136" sub="Right now" />
            <StatCard icon="💬" label="Total Messages" value={(stats?.totalMessages || 0).toLocaleString()} color="100,160,255" />
            <StatCard icon="⏱️" label="Runtime Hours" value={(stats?.totalRuntimeHours || 0).toLocaleString()} color="255,200,0" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon="🔄" label="Total Restarts" value={stats?.totalRestarts || 0} color="255,100,100" />
            <StatCard icon="⚡" label="Server Uptime" value={formatUptime(stats?.serverUptime || 0)} color="0,200,255" />
            <div className="glass-card p-5">
              <div className="text-3xl mb-1">📊</div>
              <div className="font-display text-lg font-bold text-white">Analytics</div>
              <div className="text-xs text-knight-muted font-mono mt-1 mb-3">Historical data & trends</div>
              <Link href="/dashboard/admin/analytics" className="text-xs text-knight-accent font-mono hover:underline">
                View Charts →
              </Link>
            </div>
          </div>

          {/* Live bots table */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted">
                Live Bots ({liveIds.length})
              </h2>
            </div>

            {liveIds.length === 0 ? (
              <div className="text-center py-10 text-knight-muted font-mono text-sm">
                No bots currently running.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-knight-border">
                      <th className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider pb-3 pr-4">User ID</th>
                      <th className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider pb-3 pr-4">Phone</th>
                      <th className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider pb-3 pr-4">Uptime</th>
                      <th className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider pb-3 pr-4">Messages</th>
                      <th className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveIds.map(userId => {
                      const bot = liveBots[userId]
                      const liveUpdate = botUpdates[userId]
                      const status = liveUpdate?.status || bot.status
                      return (
                        <tr key={userId} className="border-b border-knight-border border-opacity-50 hover:bg-white hover:bg-opacity-5">
                          <td className="py-3 pr-4 font-mono text-xs text-knight-muted">
                            {userId.slice(0, 8)}...
                          </td>
                          <td className="py-3 pr-4 font-mono text-white">
                            {bot.phoneNumber ? `+${bot.phoneNumber}` : '—'}
                          </td>
                          <td className="py-3 pr-4 font-mono text-blue-300">
                            {formatUptime(bot.uptimeSeconds)}
                          </td>
                          <td className="py-3 pr-4 font-mono text-white">
                            {(bot.messageCount || 0).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleBotAction(userId, 'restart')}
                                className="text-xs px-2 py-1 rounded border border-knight-accent border-opacity-30 text-knight-accent hover:bg-knight-accent hover:bg-opacity-10 transition-all font-mono"
                              >
                                Restart
                              </button>
                              <button
                                onClick={() => handleBotAction(userId, 'stop')}
                                className="text-xs px-2 py-1 rounded border border-knight-red border-opacity-30 text-knight-red hover:bg-knight-red hover:bg-opacity-10 transition-all font-mono"
                              >
                                Stop
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
