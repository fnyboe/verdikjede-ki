'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/db/users'
import type { ServerActionResult } from '@/types'

export async function deleteAnalyseAction(analyseId: string): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  if (profileResult.data.role === 'admin') return { success: false, error: 'Admin kan ikkje slette analysar' }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('analyses').delete().eq('id', analyseId)

  if (error) return { success: false, error: 'Kunne ikkje slette analysen: ' + error.message }
  return { success: true }
}

export async function inviteMember(
  _prev: unknown,
  formData: FormData
): Promise<ServerActionResult> {
  const email = (formData.get('email') as string).trim()

  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  if (!profile.company_id) return { success: false, error: 'Ingen bedrift knytt til kontoen' }
  if (profile.role === 'admin') return { success: false, error: 'Admin kan ikkje invitere via dashboard' }

  const supabase = createSupabaseServerClient()
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
