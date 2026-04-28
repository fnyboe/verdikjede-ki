import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile, ServerActionResult } from '@/types'

export async function getCurrentProfile(): Promise<ServerActionResult<Profile>> {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Ikkje innlogga' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Profile }
}
