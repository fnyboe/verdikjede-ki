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
