import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAnalysisById } from '@/lib/db/analyses'
import Link from 'next/link'
import { AutoDownload } from './AutoDownload'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RapportPage({ params }: Props) {
  const { id } = await params

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await getAnalysisById(id)
  if (!result.success || !result.data) redirect('/dashboard')
  const analyse = result.data

  return (
    <div className="flex flex-col gap-6">
      <AutoDownload id={id} />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">{analyse.title}</p>
        <h1 className="text-2xl font-bold text-[#1E293B]">Sluttrapport</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-base font-semibold text-[#1E293B]">Nedlasting startar automatisk…</p>
          <p className="text-sm text-slate-500">Viss ikkje, klikk knappen under.</p>
        </div>
        <a
          href={`/api/rapport/${id}`}
          className="px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Last ned PDF-rapport
        </a>
      </div>

      <div className="flex justify-start">
        <Link
          href={`/analyse/${id}/steg/5`}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          ← Tilbake til steg 5
        </Link>
      </div>
    </div>
  )
}
