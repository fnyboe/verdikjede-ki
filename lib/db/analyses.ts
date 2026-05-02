import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Analysis, ServerActionResult } from '@/types'

export async function getAnalysesByCompany(companyId: string): Promise<ServerActionResult<Analysis[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Analysis[] }
}

export async function getAllAnalyses(): Promise<ServerActionResult<(Analysis & { company_name: string })[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  const mapped = (data as (Analysis & { companies: { name: string } })[]).map((a) => ({
    ...a,
    company_name: a.companies?.name ?? '',
  }))

  return { success: true, data: mapped }
}

export async function getAnalysisById(id: string): Promise<ServerActionResult<Analysis>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Analysis }
}

export async function saveStrategy(
  analysisId: string,
  data: { vc_control: string; tech_breadth: string; strategy_text: string | null }
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('analyses')
    .update(data)
    .eq('id', analysisId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function saveCompanyInfo(
  analysisId: string,
  data: { company_name: string; logo_base64: string | null }
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('analyses')
    .update(data)
    .eq('id', analysisId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function createAnalysis(companyId: string, title: string): Promise<ServerActionResult<Analysis>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('analyses')
    .insert({ company_id: companyId, title })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Analysis }
}
