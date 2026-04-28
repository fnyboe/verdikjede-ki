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

  const { error: deleteError } = await supabase
    .from('vc_steps')
    .delete()
    .eq('analysis_id', analysisId)

  if (deleteError) return { success: false, error: deleteError.message }

  const rows = names
    .map((name, i) => ({ analysis_id: analysisId, name: name.trim(), order_index: i }))
    .filter((r) => r.name.length > 0)

  if (rows.length === 0) return { success: false, error: 'Ingen gyldige steg' }

  const { error: insertError } = await supabase.from('vc_steps').insert(rows)
  if (insertError) return { success: false, error: insertError.message }

  return { success: true }
}
