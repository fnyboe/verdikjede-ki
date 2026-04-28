'use client'

import { useActionState, useState } from 'react'
import { signIn } from './actions'
import { Button } from '@/components/ui/button'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined)
  const [showForgot, setShowForgot] = useState(false)

  if (showForgot) {
    return <ForgotPasswordForm onBack={() => setShowForgot(false)} />
  }

  return (
    <form action={action} className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-[#1E293B]">Passord</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
      >
        {pending ? 'Logger inn...' : 'Logg inn'}
      </Button>

      <button
        type="button"
        onClick={() => setShowForgot(true)}
        className="text-sm text-[#3B82F6] hover:underline text-center"
      >
        Gløymt passord?
      </button>
    </form>
  )
}
