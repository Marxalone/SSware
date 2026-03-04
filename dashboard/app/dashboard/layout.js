'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '../../lib/supabase'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUser(session.user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(prof)
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-knight-muted text-sm font-mono">Loading panel...</p>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/bot', label: 'My Bot', icon: '🤖' },
    { href: '/dashboard/logs', label: 'Logs', icon: '📋' },
    ...(isAdmin ? [
      { href: '/dashboard/admin', label: 'Admin Panel', icon: '⚡', admin: true },
      { href: '/dashboard/admin/users', label: 'Users', icon: '👥', admin: true },
      { href: '/dashboard/admin/analytics', label: 'Analytics', icon: '📊', admin: true },
    ] : [])
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: 'rgba(10,10,18,0.95)', borderRight: '1px solid rgba(108,71,255,0.12)' }}>
        
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(108,71,255,0.12)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-knight-accent to-purple-800 flex items-center justify-center text-lg"
              style={{ boxShadow: '0 0 15px rgba(108,71,255,0.35)' }}>
              ⚔️
            </div>
            <div>
              <div className="font-display font-bold tracking-widest text-sm uppercase text-white">KnightBot</div>
              <div className="text-xs text-knight-muted font-mono">Control Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all ${
                  active
                    ? 'bg-knight-accent bg-opacity-20 text-white border border-knight-accent border-opacity-30'
                    : item.admin
                      ? 'text-yellow-400 hover:bg-yellow-400 hover:bg-opacity-10'
                      : 'text-knight-muted hover:text-white hover:bg-white hover:bg-opacity-5'
                }`}
              >
                <span>{item.icon}</span>
                <span className={item.admin ? 'font-semibold' : ''}>{item.label}</span>
                {item.admin && !active && (
                  <span className="ml-auto text-xs bg-yellow-400 bg-opacity-20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                    ADMIN
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(108,71,255,0.12)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-knight-accent to-purple-800 flex items-center justify-center text-sm font-bold">
              {(profile?.username || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {profile?.username || 'User'}
              </div>
              <div className="text-xs text-knight-muted truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-knight-muted hover:text-knight-red transition-colors py-1.5 px-3 rounded-lg hover:bg-red-950 hover:bg-opacity-40 text-left font-mono"
          >
            Sign Out →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
