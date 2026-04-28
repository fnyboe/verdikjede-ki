import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAnalysisById } from '@/lib/db/analyses'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STEG_TITLAR: Record<string, string> = {
  '1': 'Verdikjede',
  '2': 'Prosessscoring',
  '3': 'BXT-analyse',
  '4': 'Oppgåver',
  '5': 'Rapport',
}

interface Props {
  params: { id: string; steg: string }
}

export default async function StegPage({ params }: Props) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stegNr = parseInt(params.steg)
  if (isNaN(stegNr) || stegNr < 1 || stegNr > 5) redirect(`/analyse/${params.id}/steg/1`)

  const result = await getAnalysisById(params.id)
  if (!result.success || !result.data) redirect('/dashboard')

  const analyse = result.data
  const tittel = STEG_TITLAR[params.steg] ?? `Steg ${params.steg}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500 mb-1">{analyse.title}</p>
        <h1 className="text-2xl font-bold text-[#1E293B]">
          Steg {params.steg} – {tittel}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        Wizard-innhald kjem i Fase 5.
      </div>

      <div className="flex justify-between">
        {stegNr > 1 ? (
          <Link
            href={`/analyse/${params.id}/steg/${stegNr - 1}`}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ← Førre steg
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ← Tilbake til dashboard
          </Link>
        )}

        {stegNr < 5 && (
          <Link
            href={`/analyse/${params.id}/steg/${stegNr + 1}`}
            className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors"
          >
            Neste steg →
          </Link>
        )}
      </div>
    </div>
  )
}
