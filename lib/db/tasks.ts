import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Task, ServerActionResult } from '@/types'

export async function getTasksByProcess(processId: string): Promise<ServerActionResult<Task[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('process_id', processId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Task[] }
}
