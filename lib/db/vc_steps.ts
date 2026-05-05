import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { VcStep, ServerActionResult } from '@/types'

export async function getVcStepsByAnalysis(analysisId: string): Promise<ServerActionResult<VcStep[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('vc_steps')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('order_index', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as VcStep[] }
}

export async function saveVcSteps(
  analysisId: string,
  steg: { id?: string, name: string }[]
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const filled = steg.filter((s) => s.name.trim().length > 0)
  if (filled.length === 0) return { success: false, error: 'Ingen gyldige steg' }

  const { data: existing, error: fetchError } = await supabase
    .from('vc_steps')
    .select('id')
    .eq('analysis_id', analysisId)
    .order('order_index', { ascending: true })

  if (fetchError) return { success: false, error: fetchError.message }

  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
  const newIds = new Set(filled.filter((s) => s.id).map((s) => s.id as string))

  const idsToDelete = Array.from(existingIds).filter((id) => !newIds.has(id))
  if (idsToDelete.length > 0) {
    const { error } = await supabase.from('vc_steps').delete().in('id', idsToDelete)
    if (error) return { success: false, error: error.message }
  }

  for (let i = 0; i < filled.length; i++) {
    const s = filled[i]
    if (s.id) {
      const { error } = await supabase
        .from('vc_steps')
        .update({ name: s.name, order_index: i })
        .eq('id', s.id)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase
        .from('vc_steps')
        .insert({ analysis_id: analysisId, name: s.name, order_index: i })
      if (error) return { success: false, error: error.message }
    }
  }

  return { success: true }
}
