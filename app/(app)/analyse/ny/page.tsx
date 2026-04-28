'use client'

import { useFormState } from 'react-dom'
import { createAnalyseAction } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'
import Link from 'next/link'

export default function NyAnalysePage() {
  const [state, action] = useFormState(createAnalyseAction, undefined)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">Ny analyse</h1>
        <p className="text-slate-500 mt-1">Gi analysen ein tittel for å kome i gang.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium text-[#1E293B]">
              Tittel på analysen
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="T.d. «Verdikjedeanalyse 2025»"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>

          {state && !state.success && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <SubmitButton
              label="Opprett analyse"
              pendingLabel="Oppretter..."
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            />
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Avbryt
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
