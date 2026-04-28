'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ServerActionResult } from '@/types'

export async function inviteMember(
  _prev: unknown,
  formData: FormData
): Promise<ServerActionResult> {
  const email = (formData.get('email') as string).trim()

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { success: false, error: 'Ingen bedrift knytt til kontoen' }
  if (profile.role === 'admin') return { success: false, error: 'Admin kan ikkje invitere via dashboard' }

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)

  if ((count ?? 0) >= 3) {
    return { success: false, error: 'Maks 3 brukarar per bedrift (1 company + 2 members)' }
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'member', company_id: profile.company_id },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=invite`,
  })

  if (error) return { success: false, error: 'Kunne ikkje sende invitasjon: ' + error.message }

  return { success: true }
}
