'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAnalysis } from '@/lib/db/analyses'
import type { ServerActionResult } from '@/types'
import { redirect } from 'next/navigation'

export async function createAnalyseAction(
  _prev: unknown,
  formData: FormData
): Promise<ServerActionResult> {
  const title = (formData.get('title') as string).trim()

  if (!title) return { success: false, error: 'Tittel er påkravd' }

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') return { success: false, error: 'Admin kan ikkje opprette analysar' }
  if (!profile?.company_id) return { success: false, error: 'Ingen bedrift knytt til kontoen' }

  const result = await createAnalysis(profile.company_id, title)
  if (!result.success || !result.data) return { success: false, error: result.error }

  redirect(`/analyse/${result.data.id}/steg/1`)
}
