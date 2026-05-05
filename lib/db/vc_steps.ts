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

  // Slett rader som ikkje lenger er i lista (batch)
  const idsToDelete = Array.from(existingIds).filter((id) => !newIds.has(id))
  if (idsToDelete.length > 0) {
    const { error } = await supabase.from('vc_steps').delete().in('id', idsToDelete)
    if (error) return { success: false, error: error.message }
  }

  // Upsert alle steg i éin operasjon
  const toUpsert = filled.map((s, i) => ({
    ...(s.id ? { id: s.id } : {}),
    analysis_id: analysisId,
    name: s.name,
    order_index: i,
  }))

  const { error: upsertError } = await supabase
    .from('vc_steps')
    .upsert(toUpsert, { onConflict: 'id' })

  if (upsertError) return { success: false, error: upsertError.message }

  return { success: true }
}
