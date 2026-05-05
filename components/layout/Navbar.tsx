import Link from 'next/link'
import { LogoutButton } from './LogoutButton'
import { getCurrentProfile } from '@/lib/db/users'

export async function Navbar() {
  const profileResult = await getCurrentProfile()
  const profile = profileResult.success ? profileResult.data : null

  return (
    <nav className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg hover:text-white/90 transition-colors">
          Verdikjede KI-analyse
        </Link>
        {profile?.role === 'admin' && (
          <Link href="/admin/bedrifter" className="text-sm text-white/70 hover:text-white transition-colors">
            Administrasjon
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <span className="text-xs text-white/50">{profile.email}</span>
        )}
        <LogoutButton />
      </div>
    </nav>
  )
}
