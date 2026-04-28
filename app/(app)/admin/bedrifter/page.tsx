import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteCompanyForm } from './InviteCompanyForm'
import type { Company } from '@/types'

export default async function BedrifterPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Bedrifter</h1>
        <p className="text-slate-500 mt-1">Inviter nye bedrifter og sjå eksisterande.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-[#1E293B]">Inviter ny bedrift</h2>
        <InviteCompanyForm />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4 text-[#1E293B]">Alle bedrifter</h2>
        {!companies || companies.length === 0 ? (
          <p className="text-slate-500 text-sm">Ingen bedrifter enno.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(companies as Company[]).map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <span className="font-medium text-[#1E293B]">{c.name}</span>
                <span className="text-xs text-slate-400">
                  {new Date(c.created_at).toLocaleDateString('nb-NO')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
