import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAnalysesByCompany, getAllAnalyses } from '@/lib/db/analyses'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Analysis } from '@/types'

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  let analyses: Analysis[] = []

  if (isAdmin) {
    const result = await getAllAnalyses()
    if (result.success && result.data) analyses = result.data
  } else if (profile?.company_id) {
    const result = await getAnalysesByCompany(profile.company_id)
    if (result.success && result.data) analyses = result.data
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? 'Alle analysar på tvers av bedrifter (lesemodus)' : 'Dine analysar'}
          </p>
        </div>
        {!isAdmin && (
          <Link
            href="/analyse/ny"
            className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Ny analyse
          </Link>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">Ingen analysar enno.</p>
          {!isAdmin && (
            <Link
              href="/analyse/ny"
              className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Opprett din første analyse
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {analyses.map((analyse) => (
            <div key={analyse.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-[#1E293B]">{analyse.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAdmin && analyse.company_name && (
                    <span className="mr-2 text-slate-500">{analyse.company_name} ·</span>
                  )}
                  {new Date(analyse.created_at).toLocaleDateString('nb-NO', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              {!isAdmin && (
                <Link
                  href={`/analyse/${analyse.id}/steg/1`}
                  className="text-sm text-[#3B82F6] hover:underline"
                >
                  Opne →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
