import { SetPasswordForm } from './SetPasswordForm'

interface Props {
  searchParams: { token_hash?: string; type?: string }
}

export default function SetPasswordPage({ searchParams }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold mb-2 text-[#1E293B]">Set passord</h1>
        <p className="text-sm text-slate-500 mb-6">Passordet må vere minst 8 teikn.</p>
        <SetPasswordForm
          tokenHash={searchParams.token_hash}
          type={searchParams.type}
        />
      </div>
    </div>
  )
}
