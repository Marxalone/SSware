'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '../../../lib/supabase'
import { api } from '../../../lib/api'
import { useSocket } from '../../../lib/useSocket'

export default function BotPage() {
  const [token, setToken] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [botSession, setBotSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const { botStatus, pairingCode, setPairingCode } = useSocket(token)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)

      try {
        const data = await api.bot.status(session.access_token)
        setBotSession(data.session)
        if (data.session?.phone_number) {
          setPhoneInput(data.session.phone_number)
        }
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

  const isRunning = botStatus === 'running' || botStatus === 'connected'

  async function handleStart() {
    if (!phoneInput.trim()) return showMessage('Enter your WhatsApp phone number first', 'error')
    setActionLoading(true)
    try {
      await api.bot.start(token, phoneInput)
      showMessage('Bot is starting... Wait for your pairing code below.', 'success')
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStop() {
    setActionLoading(true)
    setPairingCode(null)
    try {
      await api.bot.stop(token)
      showMessage('Bot stopped.', 'info')
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRestart() {
    setActionLoading(true)
    setPairingCode(null)
    try {
      await api.bot.restart(token)
      showMessage('Bot restarting...', 'info')
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const statusColor = {
    connected: 'text-knight-green',
    running: 'text-blue-400',
    stopped: 'text-knight-muted',
    error: 'text-knight-red',
    disconnected: 'text-yellow-400',
  }[botStatus] || 'text-knight-muted'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8 animate-slide-up">
        <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">Bot Control</h1>
        <p className="text-knight-muted text-sm mt-1">Manage your WhatsApp bot session.</p>
      </div>

      {/* Message banner */}
      {message && (
        <div className={`mb-5 p-4 rounded-lg border text-sm font-mono animate-slide-up ${
          message.type === 'error' ? 'bg-red-950 border-knight-red border-opacity-40 text-knight-red' :
          message.type === 'success' ? 'bg-green-950 border-green-500 border-opacity-30 text-knight-green' :
          'bg-blue-950 border-blue-500 border-opacity-30 text-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Status card */}
      <div className="glass-card p-6 mb-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-muted">Status</h2>
          <div className="flex items-center gap-2">
            <span className={`status-dot ${botStatus}`} />
            <span className={`font-mono text-sm font-semibold uppercase ${statusColor}`}>
              {botStatus}
            </span>
          </div>
        </div>

        {botSession?.phone_number && (
          <div className="flex items-center justify-between py-3 border-t border-knight-border">
            <span className="text-knight-muted text-xs font-mono uppercase">Phone Number</span>
            <span className="text-white font-mono text-sm">+{botSession.phone_number}</span>
          </div>
        )}
        {botSession?.started_at && (
          <div className="flex items-center justify-between py-3 border-t border-knight-border">
            <span className="text-knight-muted text-xs font-mono uppercase">Started</span>
            <span className="text-white font-mono text-sm">
              {new Date(botSession.started_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Pairing code display */}
      {pairingCode && (
        <div className="glass-card p-6 mb-5 animate-slide-up" style={{ borderColor: 'rgba(0,255,136,0.3)' }}>
          <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-knight-green mb-4">
            🔑 Your Pairing Code
          </h2>
          <div className="pairing-code mb-4">{pairingCode}</div>
          <ol className="text-knight-muted text-sm space-y-1 font-mono">
            <li>1. Open WhatsApp on your phone</li>
            <li>2. Go to Settings → Linked Devices</li>
            <li>3. Tap "Link a Device"</li>
            <li>4. Tap "Link with Phone Number Instead"</li>
            <li>5. Enter the code above</li>
          </ol>
          <div className="mt-4 text-xs text-knight-muted">
            ⚠️ Code expires in a few minutes. If it expires, restart the bot.
          </div>
        </div>
      )}

      {/* Phone input + controls */}
      <div className="glass-card p-6 animate-slide-up">
        {!isRunning && (
          <div className="mb-5">
            <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">
              WhatsApp Phone Number
            </label>
            <input
              type="text"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
              className="knight-input"
              placeholder="447911123456 (no + or spaces)"
            />
            <p className="text-knight-muted text-xs mt-2 font-mono">
              International format without + — e.g. 447911123456 for UK, 15551234567 for US, 2348012345678 for Nigeria
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={actionLoading || loading}
              className="btn-success py-3 px-7 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </span>
              ) : '▶ Start Bot'}
            </button>
          ) : (
            <>
              <button
                onClick={handleRestart}
                disabled={actionLoading}
                className="btn-primary py-3 px-6 rounded-lg disabled:opacity-50"
              >
                {actionLoading ? '...' : '🔄 Restart'}
              </button>
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="btn-danger py-3 px-6 rounded-lg disabled:opacity-50"
              >
                {actionLoading ? '...' : '⏹ Stop Bot'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
