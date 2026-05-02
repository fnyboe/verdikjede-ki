import { type NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAnalysisById } from '@/lib/db/analyses'
import { getCompanyById } from '@/lib/db/companies'
import { getVcStepsByAnalysis } from '@/lib/db/vc_steps'
import { getProcessesByAnalysis } from '@/lib/db/processes'
import { getTasksByAnalysis } from '@/lib/db/tasks'
import { RapportDocument } from '@/lib/pdf/rapport'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikkje innlogga' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const analysisResult = await getAnalysisById(id)
  if (!analysisResult.success || !analysisResult.data) {
    return NextResponse.json({ error: 'Analyse ikkje funnen' }, { status: 404 })
  }
  const analysis = analysisResult.data

  if (analysis.company_id !== profile?.company_id) {
    return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 })
  }

  const [companyResult, vcResult, processResult, taskResult] = await Promise.all([
    getCompanyById(analysis.company_id),
    getVcStepsByAnalysis(id),
    getProcessesByAnalysis(id),
    getTasksByAnalysis(id),
  ])

  const companyName = companyResult.data?.name ?? ''
  const vcSteps = vcResult.data ?? []
  const processes = processResult.data ?? []
  const tasks = taskResult.data ?? []

  const element = React.createElement(
    RapportDocument,
    { analysis, companyName, vcSteps, processes, tasks }
  ) as React.ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  const filename = `rapport-${analysis.title.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '-').toLowerCase()}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
