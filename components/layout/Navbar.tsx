import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export async function Navbar() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  return (
    <nav className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg hover:text-white/90 transition-colors">
          Verdikjede KI-analyse
        </Link>
        {role === 'admin' && (
          <Link href="/admin/bedrifter" className="text-sm text-white/70 hover:text-white transition-colors">
            Administrasjon
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-xs text-white/50">{user.email}</span>
        )}
        <LogoutButton />
      </div>
    </nav>
  )
}
