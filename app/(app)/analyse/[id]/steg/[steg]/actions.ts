'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { saveVcSteps } from '@/lib/db/vc_steps'
import { getProcessesByVcStep, saveProcesses, saveWeights, updateProcessDesc, saveBxtData, saveProcessIncluded } from '@/lib/db/processes'
import { getTasksByProcess, saveTasks, deleteTask, updateTask } from '@/lib/db/tasks'
import { saveStrategy, saveCompanyInfo } from '@/lib/db/analyses'
import { getCurrentProfile } from '@/lib/db/users'
import type { Process, Task, ServerActionResult } from '@/types'

export async function saveVcStepsAction(
  analyseId: string,
  steg: { id?: string, name: string }[]
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  const filled = steg.filter((s) => s.name.trim().length > 0)
  if (filled.length < 2) {
    return { success: false, error: 'Minimum 2 steg er påkravd' }
  }

  return saveVcSteps(analyseId, steg)
}

export async function saveProcessesAction(
  analyseId: string,
  vcStepId: string,
  items: { name: string; scores: Record<string, number>; included: boolean; manually_excluded: boolean; ai_suggestion: string | null }[]
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  return saveProcesses(vcStepId, analyseId, items)
}

export async function getProcessesForVcStepAction(
  vcStepId: string
): Promise<ServerActionResult<Process[]>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { success: false, error: 'Ikkje innlogga' }
  return getProcessesByVcStep(vcStepId)
}

export async function getWeightsAction(
  analyseId: string
): Promise<ServerActionResult<Record<string, number>>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { success: false, error: 'Ikkje innlogga' }

  const supabase = createSupabaseServerClient()
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
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: process } = await supabase
    .from('processes')
    .select('analysis_id')
    .eq('id', processId)
    .single()

  if (!process) return { success: false, error: 'Prosess ikkje funnen' }

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', process.analysis_id)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang' }
  }

  return updateProcessDesc(processId, problemDesc, usecaseDesc, aiSuggestion)
}

export async function saveBxtDataAction(
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
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: process } = await supabase
    .from('processes')
    .select('analysis_id')
    .eq('id', processId)
    .single()

  if (!process) return { success: false, error: 'Prosess ikkje funnen' }

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', process.analysis_id)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang' }
  }

  return saveBxtData(processId, data)
}

export async function saveProcessIncludedAction(
  processId: string,
  included: boolean
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: process } = await supabase
    .from('processes')
    .select('analysis_id')
    .eq('id', processId)
    .single()

  if (!process) return { success: false, error: 'Prosess ikkje funnen' }

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', process.analysis_id)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang' }
  }

  return saveProcessIncluded(processId, included)
}

export async function saveWeightsAction(
  analyseId: string,
  weights: Record<string, number>
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  return saveWeights(analyseId, weights)
}

export async function getTasksByProcessAction(
  processId: string
): Promise<ServerActionResult<Task[]>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { success: false, error: 'Ikkje innlogga' }
  return getTasksByProcess(processId)
}

export async function saveTasksAction(
  processId: string,
  tasks: { name: string; automation: number; automation_reason: string; improvement: number; improvement_reason: string; tech: string }[]
): Promise<ServerActionResult<Task[]>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: process } = await supabase
    .from('processes')
    .select('analysis_id')
    .eq('id', processId)
    .single()
  if (!process) return { success: false, error: 'Prosess ikkje funnen' }

  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', process.analysis_id)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang' }
  }

  return saveTasks(processId, tasks)
}

export async function deleteTaskAction(taskId: string): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { success: false, error: 'Ikkje innlogga' }
  return deleteTask(taskId)
}

export async function saveStrategyAction(
  analyseId: string,
  data: { vc_control: string; tech_breadth: string; strategy_text: string | null }
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  return saveStrategy(analyseId, data)
}

export async function saveCompanyInfoAction(
  analyseId: string,
  data: { company_name: string; logo_base64: string | null; company_description: string; website_url: string }
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  const supabase = createSupabaseServerClient()
  const { data: analyse } = await supabase
    .from('analyses')
    .select('company_id')
    .eq('id', analyseId)
    .single()

  if (!analyse || analyse.company_id !== profile.company_id) {
    return { success: false, error: 'Ingen tilgang til denne analysen' }
  }

  return saveCompanyInfo(analyseId, data)
}

export async function updateTaskAction(
  taskId: string,
  fields: Partial<{ name: string; automation: number; automation_reason: string; improvement: number; improvement_reason: string; tech: string }>
): Promise<ServerActionResult> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { success: false, error: 'Ikkje innlogga' }
  return updateTask(taskId, fields)
}
