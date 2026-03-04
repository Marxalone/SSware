'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-white">{value}</div>
        <div className="text-xs text-knight-muted font-mono uppercase tracking-wider mt-0.5">{label}</div>
        {sub && <div className="text-xs text-knight-muted mt-1">{sub}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [session, setSession] = useState(null)
  const [botData, setBotData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setSession(session)

      try {
        const data = await api.bot.status(session.access_token)
        setBotData(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const botSession = botData?.session
  const liveInfo = botData?.live
  const isRunning = botData?.running

  function formatUptime(seconds) {
    if (!seconds) return '0s'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">
          Dashboard
        </h1>
        <p className="text-knight-muted text-sm mt-1">Welcome back. Here's your bot overview.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-knight-muted font-mono text-sm">
          <div className="w-4 h-4 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
          Loading bot data...
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className={`glass-card p-5 mb-6 flex items-center justify-between animate-slide-up`}
            style={{ borderColor: isRunning ? 'rgba(0,255,136,0.2)' : 'rgba(108,71,255,0.15)' }}>
            <div className="flex items-center gap-4">
              <div className={`status-dot ${botSession?.status || 'stopped'}`} />
              <div>
                <div className="font-display font-semibold text-lg uppercase tracking-wider text-white">
                  Bot {isRunning ? 'Online' : botSession?.status || 'Not Started'}
                </div>
                {botSession?.phone_number && (
                  <div className="text-knight-muted text-sm font-mono">+{botSession.phone_number}</div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!isRunning ? (
                <Link href="/dashboard/bot" className="btn-primary py-2 px-5 rounded-lg text-sm">
                  {botSession ? 'Start Bot' : 'Setup Bot'}
                </Link>
              ) : (
                <Link href="/dashboard/bot" className="btn-primary py-2 px-5 rounded-lg text-sm">
                  Manage Bot
                </Link>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon="⏱️"
              label="Uptime"
              value={liveInfo ? formatUptime(liveInfo.uptimeSeconds) : (botSession?.total_runtime_seconds ? formatUptime(botSession.total_runtime_seconds) : '—')}
              color="bg-blue-950"
              sub="Current session"
            />
            <StatCard
              icon="💬"
              label="Messages"
              value={((liveInfo?.messageCount || 0) + (botSession?.message_count || 0)).toLocaleString()}
              color="bg-purple-950"
              sub="Total processed"
            />
            <StatCard
              icon="🔄"
              label="Restarts"
              value={botSession?.restart_count || 0}
              color="bg-orange-950"
              sub="Total restarts"
            />
            <StatCard
              icon="📅"
              label="Since"
              value={botSession?.created_at ? formatDistanceToNow(new Date(botSession.created_at), { addSuffix: true }) : 'New'}
              color="bg-green-950"
              sub="First deployed"
            />
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5 mb-6">
            <h3 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/bot" className="btn-primary py-2 px-5 rounded-lg text-sm">
                🤖 Bot Control
              </Link>
              <Link href="/dashboard/logs" className="py-2 px-5 rounded-lg text-sm font-display font-semibold uppercase tracking-wider border border-knight-border text-knight-muted hover:text-white hover:border-knight-accent transition-all">
                📋 View Logs
              </Link>
            </div>
          </div>

          {/* Last active */}
          {botSession?.last_active && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-knight-muted text-xs font-mono uppercase tracking-wider">Last Active</span>
                <span className="text-white text-sm font-mono">
                  {formatDistanceToNow(new Date(botSession.last_active), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
