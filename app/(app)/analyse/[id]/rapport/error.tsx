'use client'

export default function RapportError({ reset }: { reset: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
      <p className="text-sm font-semibold text-red-700">Noko gjekk gale ved lasting av rapportsida.</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
      >
        Prøv igjen
      </button>
    </div>
  )
}
