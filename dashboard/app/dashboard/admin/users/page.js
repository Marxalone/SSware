'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '../../../../lib/supabase'
import { api } from '../../../../lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function AdminUsersPage() {
  const [token, setToken] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      await loadUsers(session.access_token)
    })
  }, [])

  async function loadUsers(t) {
    try {
      const data = await api.admin.users(t || token)
      setUsers(data.users || [])
    } catch (err) {
      showMessage(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function showMessage(text, type = 'info') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  async function handleRoleChange(userId, role) {
    try {
      await api.admin.setRole(token, userId, role)
      showMessage(`Role updated to ${role}`, 'success')
      await loadUsers()
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  async function handleDeleteUser(userId, username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await api.admin.deleteUser(token, userId)
      showMessage('User deleted.', 'success')
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  async function handleBotAction(userId, action) {
    try {
      if (action === 'stop') await api.admin.stopBot(token, userId)
      else await api.admin.restartBot(token, userId)
      showMessage(`Bot ${action === 'stop' ? 'stopped' : 'restarted'}.`, 'success')
    } catch (err) {
      showMessage(err.message, 'error')
    }
  }

  const filtered = users.filter(u =>
    !search ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 animate-slide-up">
        <div className="inline-flex items-center gap-2 bg-yellow-400 bg-opacity-10 border border-yellow-400 border-opacity-30 px-3 py-1 rounded-full mb-3">
          <span className="text-yellow-400 text-xs font-mono uppercase tracking-wider">⚡ Admin Panel</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-wider uppercase text-white">User Management</h1>
        <p className="text-knight-muted text-sm mt-1">{users.length} total users</p>
      </div>

      {message && (
        <div className={`mb-5 p-4 rounded-lg text-sm font-mono border animate-slide-up ${
          message.type === 'error' ? 'bg-red-950 border-knight-red border-opacity-40 text-knight-red' :
          'bg-green-950 border-green-500 border-opacity-30 text-knight-green'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="knight-input max-w-sm"
          placeholder="Search by username or ID..."
        />
      </div>

      {loading ? (
        <div className="text-knight-muted font-mono text-sm flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
          Loading users...
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(108,71,255,0.15)' }}>
                  {['User', 'Role', 'Bot Status', 'Phone', 'Messages', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left text-knight-muted text-xs font-mono uppercase tracking-wider p-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const session = user.bot_sessions?.[0]
                  const isLive = user.liveStatus?.status === 'running'
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-knight-border border-opacity-30 hover:bg-white hover:bg-opacity-5 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-knight-accent to-purple-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(user.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">{user.username || 'Unknown'}</div>
                            <div className="text-knight-muted text-xs font-mono">{user.id.slice(0, 12)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${
                          user.role === 'admin'
                            ? 'bg-yellow-400 bg-opacity-15 text-yellow-400 border border-yellow-400 border-opacity-30'
                            : 'bg-knight-border text-knight-muted'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${isLive ? 'running' : (session?.status || 'stopped')}`} />
                          <span className="font-mono text-xs text-knight-muted uppercase">
                            {isLive ? 'live' : (session?.status || 'none')}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-xs text-white">
                        {session?.phone_number ? `+${session.phone_number}` : '—'}
                      </td>

                      <td className="p-4 font-mono text-xs text-white">
                        {(session?.message_count || 0).toLocaleString()}
                      </td>

                      <td className="p-4 text-knight-muted text-xs font-mono whitespace-nowrap">
                        {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : '—'}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isLive && (
                            <>
                              <button
                                onClick={() => handleBotAction(user.id, 'restart')}
                                className="text-xs px-2 py-1 rounded border border-blue-500 border-opacity-30 text-blue-400 hover:bg-blue-500 hover:bg-opacity-10 transition-all font-mono"
                              >↺</button>
                              <button
                                onClick={() => handleBotAction(user.id, 'stop')}
                                className="text-xs px-2 py-1 rounded border border-knight-red border-opacity-30 text-knight-red hover:bg-knight-red hover:bg-opacity-10 transition-all font-mono"
                              >⏹</button>
                            </>
                          )}
                          <select
                            value={user.role || 'user'}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded border border-knight-border bg-knight-surface text-knight-muted font-mono cursor-pointer"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-xs px-2 py-1 rounded border border-knight-red border-opacity-20 text-knight-red hover:bg-knight-red hover:bg-opacity-10 transition-all font-mono opacity-60 hover:opacity-100"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-10 text-knight-muted font-mono text-sm">
                No users found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
