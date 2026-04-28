'use client'

import { useFormState } from 'react-dom'
import { inviteMember } from './actions'
import { SubmitButton } from '@/components/ui/SubmitButton'

export function InviteMemberForm() {
  const [state, action] = useFormState(inviteMember, undefined)

  return (
    <form action={action} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-[#1E293B]">E-post til ny brukar</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Invitasjon sendt!
        </p>
      )}

      <SubmitButton
        label="Inviter brukar"
        pendingLabel="Sender..."
        className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
      />
    </form>
  )
}
