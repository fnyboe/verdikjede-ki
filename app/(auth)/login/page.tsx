import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-[#1E293B]">Logg inn</h1>
        <LoginForm />
      </div>
    </div>
  )
}
