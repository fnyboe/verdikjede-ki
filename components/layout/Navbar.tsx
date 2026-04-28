import { LogoutButton } from './LogoutButton'

export function Navbar() {
  return (
    <nav className="bg-[#1E293B] text-white px-6 py-4 flex items-center justify-between">
      <span className="font-bold text-lg">Verdikjede KI-analyse</span>
      <LogoutButton />
    </nav>
  )
}
