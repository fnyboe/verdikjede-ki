'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'

interface Props {
  tokenHash?: string
  type?: string
}

export function SetPasswordForm({ tokenHash, type }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password.length < 8) {
      setError('Passordet må vere minst 8 teikn')
      setPending(false)
      return
    }

    if (password !== confirm) {
      setError('Passorda er ikkje like')
      setPending(false)
      return
    }

    const supabase = createSupabaseBrowserClient()

    if (tokenHash && type) {
      const otpType = type === 'invite' ? 'email' : type as 'recovery' | 'email' | 'signup' | 'magiclink'
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      if (otpError) {
        setError(`Lenka er ugyldig eller utløpt: ${otpError.message}`)
        setPending(false)
        return
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(`Kunne ikkje oppdatere passordet: ${updateError.message}`)
      setPending(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
      >
        {pending ? 'Lagrar...' : 'Set passord'}
      </Button>
    </form>
  )
}
