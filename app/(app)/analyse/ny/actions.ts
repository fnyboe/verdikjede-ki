'use server'

import { createAnalysis } from '@/lib/db/analyses'
import { getCurrentProfile } from '@/lib/db/users'
import type { ServerActionResult } from '@/types'
import { redirect } from 'next/navigation'

export async function createAnalyseAction(
  _prev: unknown,
  formData: FormData
): Promise<ServerActionResult> {
  const title = (formData.get('title') as string).trim()

  if (!title) return { success: false, error: 'Tittel er påkravd' }

  const profileResult = await getCurrentProfile()
  if (!profileResult.success || !profileResult.data) return { success: false, error: 'Ikkje innlogga' }
  const profile = profileResult.data

  if (profile.role === 'admin') return { success: false, error: 'Admin kan ikkje opprette analysar' }
  if (!profile.company_id) return { success: false, error: 'Ingen bedrift knytt til kontoen' }

  const result = await createAnalysis(profile.company_id, title)
  if (!result.success || !result.data) return { success: false, error: result.error }

  redirect(`/analyse/${result.data.id}/steg/1`)
}
