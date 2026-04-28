const TITLAR: Record<number, string> = {
  1: 'Definér verdikjedesteg',
  2: 'Definér prosesser — vurder objektivt',
  3: 'Vurder prosesser subjektivt',
  4: 'Vurder oppgåver',
  5: 'Strategi for implementering',
}

interface Props {
  stegNr: number
}

export function WizardSteps({ stegNr }: Props) {
  return (
    <div className="flex items-start gap-0 w-full">
      {[1, 2, 3, 4, 5].map((n, idx) => {
        const isActive = n === stegNr
        const isDone = n < stegNr
        const isLast = n === 5

        const color = isActive
          ? 'text-[#10B981]'
          : isDone
          ? 'text-[#1E293B]'
          : 'text-[#94A3B8]'

        const dotBg = isActive
          ? 'bg-[#10B981]'
          : isDone
          ? 'bg-[#1E293B]'
          : 'bg-[#CBD5E1]'

        const lineColor = isDone ? 'bg-[#1E293B]' : 'bg-[#E2E8F0]'

        return (
          <div key={n} className={`flex items-start ${isLast ? 'flex-none' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-1.5 min-w-[2rem]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${dotBg}`}>
                {isDone ? '✓' : n}
              </div>
              <span className={`text-xs font-medium text-center leading-tight max-w-[90px] ${color}`}>
                {TITLAR[n]}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 flex-1 mt-3.5 mx-1 ${lineColor}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
