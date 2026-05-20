'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAnalyseAction } from './actions'

interface Props {
  analyseId: string
  analyseTitle: string
}

export function DeleteAnalyseButton({ analyseId, analyseTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteAnalyseAction(analyseId)
    if (!result.success) {
      setError(result.error ?? 'Noko gjekk gale')
      setLoading(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Slett analyse"
        className="text-slate-400 hover:text-red-500 transition-colors p-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[#1E293B]">Slett analyse?</h2>
            <p className="text-sm text-slate-600">
              Er du sikker på at du vil slette <span className="font-semibold">&laquo;{analyseTitle}&raquo;</span>? Dette vil permanent slette:
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-0.5">
              <li>Alle verdikjedesteg</li>
              <li>Alle prosessar og scorar</li>
              <li>Alle oppgåver</li>
              <li>Rapporten</li>
            </ul>
            <p className="text-sm font-semibold text-red-600">Denne handlinga kan ikkje angrast.</p>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setOpen(false); setError(null) }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Slettar...' : 'Slett permanent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
