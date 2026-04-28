'use client'

import { useFormState } from 'react-dom'
import { resetPassword } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [state, action] = useFormState(resetPassword, undefined)

  if (state?.success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Viss e-postadressa finst, har du fått ein lenke for å tilbakestille passordet.
        </p>
        <button type="button" onClick={onBack} className="text-sm text-[#3B82F6] hover:underline text-center">
          Tilbake til innlogging
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Skriv inn e-postadressa di, så sender vi deg ein lenke for å tilbakestille passordet.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-[#1E293B]">E-post</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      <SubmitButton
        label="Send tilbakestillingslenke"
        pendingLabel="Sender..."
        className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
      />

      <button type="button" onClick={onBack} className="text-sm text-[#3B82F6] hover:underline text-center">
        Tilbake til innlogging
      </button>
    </form>
  )
}
