'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ServerActionResult } from '@/types'
import { redirect } from 'next/navigation'

export async function updatePassword(_prev: unknown, formData: FormData): Promise<ServerActionResult> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password.length < 8) {
    return { success: false, error: 'Passordet må vere minst 8 teikn' }
  }

  if (password !== confirm) {
    return { success: false, error: 'Passorda er ikkje like' }
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { success: false, error: `Kunne ikkje oppdatere passordet: ${error.message}` }

  redirect('/dashboard')
}
