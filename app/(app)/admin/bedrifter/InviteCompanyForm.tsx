'use client'

import { useActionState } from 'react'
import { inviteCompany } from './actions'
import { Button } from '@/components/ui/button'

export function InviteCompanyForm() {
  const [state, action, pending] = useActionState(inviteCompany, undefined)

  return (
    <form action={action} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1">
        <label htmlFor="companyName" className="text-sm font-medium text-[#1E293B]">Bedriftsnamn</label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-[#1E293B]">E-post til kontaktperson</label>
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

      <Button
        type="submit"
        disabled={pending}
        className="bg-[#10B981] hover:bg-[#059669] text-white"
      >
        {pending ? 'Sender...' : 'Inviter bedrift'}
      </Button>
    </form>
  )
}
