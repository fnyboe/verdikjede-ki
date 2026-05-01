export const dynamic = 'force-dynamic'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAnalysisById } from '@/lib/db/analyses'
import { getVcStepsByAnalysis } from '@/lib/db/vc_steps'
import { redirect } from 'next/navigation'
import { Step1Verdikjede } from '@/components/wizard/Step1Verdikjede'
import { Step2Prosessscoring } from '@/components/wizard/Step2Prosessscoring'
import { Step3BXT } from '@/components/wizard/Step3BXT'
import { Step4Oppgaver } from '@/components/wizard/Step4Oppgaver'
import { Step5Strategi } from '@/components/wizard/Step5Strategi'
import { WizardSteps } from '@/components/wizard/WizardSteps'
import type { VcStep } from '@/types'

interface Props {
  params: Promise<{ id: string; steg: string }>
}

export default async function StegPage({ params }: Props) {
  const { id, steg: stegParam } = await params

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stegNr = parseInt(stegParam)
  if (isNaN(stegNr) || stegNr < 1 || stegNr > 5) redirect(`/analyse/${id}/steg/1`)


  const result = await getAnalysisById(id)
  if (!result.success || !result.data) redirect('/dashboard')

  const analyse = result.data

  if (stegNr === 1) {
    const vcResult = await getVcStepsByAnalysis(id)
    const eksisterendeSteg = vcResult.data ?? []

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{analyse.title}</p>
          <WizardSteps stegNr={stegNr} />
        </div>
        <Step1Verdikjede key={Date.now()} analyseId={id} eksisterendeSteg={eksisterendeSteg} />
      </div>
    )
  } else if (stegNr === 2) {
    const vcResult = await getVcStepsByAnalysis(id)
    const vcSteps: VcStep[] = vcResult.data ?? []

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{analyse.title}</p>
          <WizardSteps stegNr={stegNr} />
        </div>
        <Step2Prosessscoring
          key={Date.now()}
          analyseId={id}
          analysisTitle={analyse.title}
          vcSteps={vcSteps}
        />
      </div>
    )
  } else if (stegNr === 3) {
    const vcResult = await getVcStepsByAnalysis(id)
    const vcSteps: VcStep[] = vcResult.data ?? []

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{analyse.title}</p>
          <WizardSteps stegNr={stegNr} />
        </div>
        <Step3BXT
          key={Date.now()}
          analyseId={id}
          analysisTitle={analyse.title}
          vcSteps={vcSteps}
        />
      </div>
    )
  } else if (stegNr === 4) {
    const vcResult = await getVcStepsByAnalysis(id)
    const vcSteps: VcStep[] = vcResult.data ?? []

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{analyse.title}</p>
          <WizardSteps stegNr={stegNr} />
        </div>
        <Step4Oppgaver
          key={Date.now()}
          analyseId={id}
          analysisTitle={analyse.title}
          vcSteps={vcSteps}
        />
      </div>
    )
  } else {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{analyse.title}</p>
          <WizardSteps stegNr={stegNr} />
        </div>
        <Step5Strategi
          key={Date.now()}
          analyseId={id}
          analysisTitle={analyse.title}
          analysis={analyse}
        />
      </div>
    )
  }
}
