import { getAnalysisById } from '@/lib/db/analyses'
import { redirect } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function RapportPage({ params }: Props) {
  const result = await getAnalysisById(params.id)
  if (!result.success || !result.data) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-slate-500 mb-1">{result.data.title}</p>
        <h1 className="text-2xl font-bold text-[#1E293B]">Rapport</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        Rapportgenerering kjem i Fase 6.
      </div>
    </div>
  )
}
