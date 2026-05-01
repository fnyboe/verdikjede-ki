export default function RapportLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center gap-4">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 w-40 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
