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

export async function saveVcSteps(analysisId: string, names: string[]): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const filled = names.map((n) => n.trim()).filter((n) => n.length > 0)
  if (filled.length === 0) return { success: false, error: 'Ingen gyldige steg' }

  const { data: existing, error: fetchError } = await supabase
    .from('vc_steps')
    .select('id')
    .eq('analysis_id', analysisId)
    .order('order_index', { ascending: true })

  if (fetchError) return { success: false, error: fetchError.message }

  const existingRows = (existing ?? []) as { id: string }[]

  for (let i = 0; i < Math.min(filled.length, existingRows.length); i++) {
    const { error } = await supabase
      .from('vc_steps')
      .update({ name: filled[i], order_index: i })
      .eq('id', existingRows[i].id)
    if (error) return { success: false, error: error.message }
  }

  if (filled.length > existingRows.length) {
    const newRows = filled.slice(existingRows.length).map((name, j) => ({
      analysis_id: analysisId,
      name,
      order_index: existingRows.length + j,
    }))
    const { error } = await supabase.from('vc_steps').insert(newRows)
    if (error) return { success: false, error: error.message }
  }

  if (existingRows.length > filled.length) {
    const idsToDelete = existingRows.slice(filled.length).map((r) => r.id)
    const { error } = await supabase.from('vc_steps').delete().in('id', idsToDelete)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}
