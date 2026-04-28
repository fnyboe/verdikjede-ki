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
