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
  items: { name: string; scores: Record<string, number>; included: boolean; ai_suggestion: string | null }[]
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const rows = items
    .map((item, i) => ({
      analysis_id: analysisId,
      vc_step_id: vcStepId,
      name: item.name.trim(),
      scores: item.scores,
      included: item.included,
      order_index: i,
      ai_suggestion: item.ai_suggestion ?? null,
    }))
    .filter((r) => r.name.length > 0)

  if (rows.length === 0) return { success: true }

  const { data: existing, error: fetchError } = await supabase
    .from('processes')
    .select('id')
    .eq('vc_step_id', vcStepId)
    .order('order_index', { ascending: true })

  if (fetchError) return { success: false, error: fetchError.message }
  const existingRows = (existing ?? []) as { id: string }[]

  for (let i = 0; i < Math.min(rows.length, existingRows.length); i++) {
    const { error } = await supabase
      .from('processes')
      .update({
        name: rows[i].name,
        scores: rows[i].scores,
        included: rows[i].included,
        order_index: rows[i].order_index,
        ai_suggestion: rows[i].ai_suggestion,
      })
      .eq('id', existingRows[i].id)
    if (error) return { success: false, error: error.message }
  }

  if (rows.length > existingRows.length) {
    const { error } = await supabase.from('processes').insert(rows.slice(existingRows.length))
    if (error) return { success: false, error: error.message }
  }

  if (existingRows.length > rows.length) {
    const idsToDelete = existingRows.slice(rows.length).map((r) => r.id)
    const { error } = await supabase.from('processes').delete().in('id', idsToDelete)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateProcessDesc(
  processId: string,
  problemDesc: string,
  usecaseDesc: string,
  aiSuggestion: string | null
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()

  const { error } = await supabase
    .from('processes')
    .update({
      problem_desc: problemDesc,
      usecase_desc: usecaseDesc,
      ai_suggestion: aiSuggestion,
    })
    .eq('id', processId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function saveBxtData(
  processId: string,
  data: {
    problem_desc: string
    usecase_desc: string
    business_goal: string
    key_results: string
    responsible: string
    bxt_scores: Record<string, number | string>
    ai_suggestion: string | null
  }
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('processes')
    .update({
      problem_desc: data.problem_desc,
      usecase_desc: data.usecase_desc,
      business_goal: data.business_goal,
      key_results: data.key_results,
      responsible: data.responsible,
      bxt_scores: data.bxt_scores,
      ai_suggestion: data.ai_suggestion,
    })
    .eq('id', processId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function saveProcessIncluded(
  processId: string,
  included: boolean
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('processes')
    .update({ included })
    .eq('id', processId)
  if (error) return { success: false, error: error.message }
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
