'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ServerActionResult } from '@/types'

export async function inviteCompany(
  _prev: unknown,
  formData: FormData
): Promise<ServerActionResult> {
  const companyName = (formData.get('companyName') as string).trim()
  const email = (formData.get('email') as string).trim()

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { success: false, error: 'Ikkje tilgang' }

  const admin = createSupabaseAdminClient()

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: companyName })
    .select()
    .single()

  if (companyError) return { success: false, error: 'Kunne ikkje opprette bedrift' }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'company', company_id: company.id },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
  })

  if (inviteError) {
    await admin.from('companies').delete().eq('id', company.id)
    return { success: false, error: 'Kunne ikkje sende invitasjon: ' + inviteError.message }
  }

  return { success: true }
}
