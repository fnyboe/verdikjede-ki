import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Process, ServerActionResult } from '@/types'

export async function getProcessesByAnalysis(analysisId: string): Promise<ServerActionResult<Process[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('order_index', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Process[] }
}

export async function getProcessesByVcStep(vcStepId: string): Promise<ServerActionResult<Process[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .eq('vc_step_id', vcStepId)
    .order('order_index', { ascending: true })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Process[] }
}

export async function saveProcesses(
  vcStepId: string,
  analysisId: string,
  items: { name: string; scores: Record<string, number> }[]
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const { error: deleteError } = await supabase
    .from('processes')
    .delete()
    .eq('vc_step_id', vcStepId)

  if (deleteError) return { success: false, error: deleteError.message }

  const rows = items
    .map((item, i) => ({
      analysis_id: analysisId,
      vc_step_id: vcStepId,
      name: item.name.trim(),
      scores: item.scores,
      order_index: i,
    }))
    .filter((r) => r.name.length > 0)

  if (rows.length === 0) return { success: true }

  const { error: insertError } = await supabase.from('processes').insert(rows)
  if (insertError) return { success: false, error: insertError.message }

  return { success: true }
}

export async function saveWeights(
  analysisId: string,
  weights: Record<string, number>
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from('analyses')
    .update({ weights })
    .eq('id', analysisId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
