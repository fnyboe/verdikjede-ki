'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { saveVcSteps } from '@/lib/db/vc_steps'
import { getProcessesByVcStep, saveProcesses, saveWeights, updateProcessDesc } from '@/lib/db/processes'
import type { Process, ServerActionResult } from '@/types'

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

export async function saveProcessesAction(
  analyseId: string,
  vcStepId: string,
  items: { name: string; scores: Record<string, number>; included: boolean; ai_suggestion: string | null }[]
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

  return saveProcesses(vcStepId, analyseId, items)
}

export async function getProcessesForVcStepAction(
  vcStepId: string
): Promise<ServerActionResult<Process[]>> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }
  return getProcessesByVcStep(vcStepId)
}

export async function getWeightsAction(
  analyseId: string
): Promise<ServerActionResult<Record<string, number>>> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data, error } = await supabase
    .from('analyses')
    .select('weights')
    .eq('id', analyseId)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: (data.weights ?? {}) as Record<string, number> }
}

export async function saveProcessDescAction(
  processId: string,
  problemDesc: string,
  usecaseDesc: string,
  aiSuggestion: string | null
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikkje innlogga' }

  const { data: process } = await supabase
    .from('processes')
    .select('analysis_id')
    .eq('id', processId)
    .single()

  if (!process) return { success: false, error: 'Prosess ikkje funnen' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', process.analysis_id)
    .single()

  if (!analyse || analyse.company_id !== profile?.company_id) {
    return { success: false, error: 'Ingen tilgang' }
  }

  return updateProcessDesc(processId, problemDesc, usecaseDesc, aiSuggestion)
}

export async function saveWeightsAction(
  analyseId: string,
  weights: Record<string, number>
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

  return saveWeights(analyseId, weights)
}
