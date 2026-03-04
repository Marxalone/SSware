'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    })
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-knight-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-knight-muted text-sm font-mono">Loading...</p>
      </div>
    </div>
  )
}
