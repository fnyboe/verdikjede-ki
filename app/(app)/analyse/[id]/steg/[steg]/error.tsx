'use client'

export default function StegError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold text-destructive">Noko gjekk gale</h2>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-4 underline">Prøv igjen</button>
    </div>
  )
}
