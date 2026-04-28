import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Company, ServerActionResult } from '@/types'

export async function getCompanyById(id: string): Promise<ServerActionResult<Company>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Company }
}
