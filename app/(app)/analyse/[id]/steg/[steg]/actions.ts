'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { saveVcSteps } from '@/lib/db/vc_steps'
import type { ServerActionResult } from '@/types'

export async function saveVcStepsAction(
  analyseId: string,
  names: string[]
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile?.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  const filled = names.filter((n) => n.trim().length > 0)
  if (filled.length < 2) {
    return { success: false, error: 'Minimum 2 steg er påkravd' }
  }

  return saveVcSteps(analyseId, names)
}
