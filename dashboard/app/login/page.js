'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center noise-bg px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-knight-accent opacity-5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-800 opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-knight-accent to-purple-800 mb-4 shadow-lg" style={{boxShadow: '0 0 30px rgba(108,71,255,0.4)'}}>
            <span className="text-2xl">⚔️</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-widest text-white uppercase">Knight Bot</h1>
          <p className="text-knight-muted text-sm mt-1">WhatsApp Bot Control Panel</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="font-display text-xl font-semibold tracking-wider uppercase mb-6 text-center">Sign In</h2>

          {error && (
            <div className="bg-red-950 border border-knight-red border-opacity-40 rounded-lg p-3 mb-5 text-knight-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="knight-input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="knight-input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 px-6 rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-knight-muted text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-knight-accent hover:text-purple-400 transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
