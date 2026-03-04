'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '../../lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', username: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match')
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters')
    }
    if (!form.username.trim()) {
      return setError('Username is required')
    }

    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { username: form.username }
        }
      })

      if (error) throw error

      // Create profile
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: form.username,
          role: 'user'
        })
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center animate-slide-up">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display text-2xl font-bold tracking-wider uppercase mb-3">Account Created!</h2>
          <p className="text-knight-muted mb-6">Check your email to confirm your account, then log in.</p>
          <Link href="/login" className="btn-primary py-3 px-8 rounded-lg inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center noise-bg px-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-knight-accent opacity-5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-knight-accent to-purple-800 mb-4" style={{boxShadow: '0 0 30px rgba(108,71,255,0.4)'}}>
            <span className="text-2xl">⚔️</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-widest text-white uppercase">Knight Bot</h1>
          <p className="text-knight-muted text-sm mt-1">Create your account</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-display text-xl font-semibold tracking-wider uppercase mb-6 text-center">Register</h2>

          {error && (
            <div className="bg-red-950 border border-knight-red border-opacity-40 rounded-lg p-3 mb-5 text-knight-red text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => update('username', e.target.value)}
                className="knight-input"
                placeholder="your_name"
                required
              />
            </div>
            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="knight-input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                className="knight-input"
                placeholder="Min 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-knight-muted text-xs font-mono uppercase tracking-wider mb-2">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
                className="knight-input"
                placeholder="Repeat password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 px-6 rounded-lg mt-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-knight-muted text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-knight-accent hover:text-purple-400 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
