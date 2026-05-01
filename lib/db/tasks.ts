import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Task, ServerActionResult } from '@/types'

type TaskInput = {
  name: string
  automation: number
  automation_reason: string
  improvement: number
  improvement_reason: string
  tech: string
}

export async function getTasksByProcess(processId: string): Promise<ServerActionResult<Task[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('process_id', processId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Task[] }
}

export async function getTasksByAnalysis(analysisId: string): Promise<ServerActionResult<Task[]>> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, processes!inner(analysis_id)')
    .eq('processes.analysis_id', analysisId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Task[] }
}

export async function saveTasks(
  processId: string,
  tasks: TaskInput[]
): Promise<ServerActionResult<Task[]>> {
  const supabase = createSupabaseServerClient()

  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('process_id', processId)

  if (deleteError) return { success: false, error: deleteError.message }
  if (tasks.length === 0) return { success: true, data: [] }

  const rows = tasks.map(t => ({
    process_id: processId,
    name: t.name,
    automation: t.automation,
    automation_reason: t.automation_reason,
    improvement: t.improvement,
    improvement_reason: t.improvement_reason,
    tech: t.tech,
  }))

  const { data, error } = await supabase.from('tasks').insert(rows).select()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Task[] }
}

export async function deleteTask(taskId: string): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateTask(
  taskId: string,
  fields: Partial<TaskInput & { name: string }>
): Promise<ServerActionResult> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('tasks').update(fields).eq('id', taskId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
