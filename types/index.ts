export type UserRole = 'admin' | 'company' | 'member'

export interface Profile {
  id: string
  email: string
  role: UserRole
  company_id: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  created_at: string
}

export interface Analysis {
  id: string
  company_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Process {
  id: string
  analysis_id: string
  name: string
  order_index: number
  problem_desc: string | null
  usecase_desc: string | null
  ai_suggestion: string | null
  created_at: string
}

export interface Task {
  id: string
  process_id: string
  name: string
  automation: string
  potential: string
  tech: string
  created_at: string
}

export interface VcStep {
  id: string
  analysis_id: string
  name: string
  order_index: number
  created_at: string
}

export interface ServerActionResult<T = undefined> {
  success: boolean
  data?: T
  error?: string
}
