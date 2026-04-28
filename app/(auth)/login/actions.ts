'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ServerActionResult } from '@/types'
import { redirect } from 'next/navigation'

export async function signIn(_prev: unknown, formData: FormData): Promise<ServerActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { success: false, error: 'Feil e-post eller passord' }

  redirect('/dashboard')
}

export async function resetPassword(_prev: unknown, formData: FormData): Promise<ServerActionResult> {
  const email = formData.get('email') as string
  const supabase = createSupabaseServerClient()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
  })

  return { success: true }
}
