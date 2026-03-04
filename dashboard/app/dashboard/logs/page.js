'use client'
import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '../../../lib/supabase'
import { api } from '../../../lib/api'
import { useSocket } from '../../../lib/useSocket'

export default function LogsPage() {
  const [token, setToken] = useState(null)
  const [filter, setFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef(null)

  const { logs, setLogs, botStatus } = useSocket(token)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)

      // Load existing logs
      try {
        const data = await api.bot.logs(session.access_token)
        if (data.logs?.length > 0) setLogs(data.logs)
      } catch (err) {
        console.error(err)
      }
    })
  }, [])

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.level === filter)

  function levelClass(level) {
    switch (level) {
      case 'error': return 'log-error'
      case 'warn': return 'log-warn'
      case 'pairing': return 'log-pairing'
      default: return 'log-info'
    }
  }

  function levelIcon(level) {
    switch (level) {
      case 'error': return '✗'
      case 'warn': return '!'
      case 'pairing': return '🔑'
      default: return '›'
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 animate-slide-up flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">Bot Logs</h1>
          <p className="text-knight-muted text-sm mt-1">Live output from your running bot.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`status-dot ${botStatus}`} />
          <span className="text-knight-muted text-xs font-mono uppercase">{botStatus}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {['all', 'info', 'warn', 'error'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-all ${
              filter === f
                ? 'bg-knight-accent bg-opacity-20 text-white border-knight-accent border-opacity-40'
                : 'text-knight-muted border-knight-border hover:border-knight-muted'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-knight-muted font-mono">Auto-scroll</span>
            <div
              onClick={() => setAutoScroll(!autoScroll)}
              className={`w-9 h-5 rounded-full transition-all cursor-pointer relative ${autoScroll ? 'bg-knight-accent' : 'bg-knight-border'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${autoScroll ? 'left-4' : 'left-0.5'}`} />
            </div>
          </label>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-knight-muted font-mono hover:text-knight-red transition-colors border border-knight-border hover:border-knight-red px-3 py-1.5 rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log viewer */}
      <div
        className="glass-card log-viewer overflow-y-auto"
        style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-knight-muted">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <p className="font-mono text-sm">No logs yet. Start your bot to see output here.</p>
          </div>
        ) : (
          <div className="p-4 space-y-0.5">
            {filteredLogs.map((log, i) => (
              <div key={i} className={`flex gap-3 py-0.5 group hover:bg-white hover:bg-opacity-5 rounded px-2 -mx-2`}>
                <span className="text-knight-muted opacity-50 flex-shrink-0 w-20 text-right">
                  {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className={`flex-shrink-0 ${levelClass(log.level)}`}>
                  {levelIcon(log.level)}
                </span>
                <span className={`flex-1 break-all ${levelClass(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-knight-muted font-mono">{filteredLogs.length} entries</span>
        <span className="text-xs text-knight-muted font-mono">Showing last 200 lines in memory</span>
      </div>
    </div>
  )
}
