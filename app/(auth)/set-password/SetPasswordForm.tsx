'use client'

import { useFormState } from 'react-dom'
import { updatePassword } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'

export function SetPasswordForm() {
  const [state, action] = useFormState(updatePassword, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-[#1E293B]">Nytt passord</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-medium text-[#1E293B]">Bekreft passord</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <SubmitButton
        label="Set passord"
        pendingLabel="Lagrar..."
        className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
      />
    </form>
  )
}
