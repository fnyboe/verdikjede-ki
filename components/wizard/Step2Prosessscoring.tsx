'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProcessesAction, saveWeightsAction } from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import { DIMS } from '@/lib/constants'
import type { VcStep, Process } from '@/types'

interface ProcessRow {
  name: string
  scores: Record<string, number>
  included: boolean
}

interface Props {
  analyseId: string
  analysisTitle: string
  vcSteps: VcStep[]
  initialProcesses: Record<string, Process[]>
  initialWeights: Record<string, number>
}

function defaultScores(): Record<string, number> {
  return Object.fromEntries(DIMS.map((d) => [d.key, 3]))
}

function calcWeightedAvg(scores: Record<string, number>, weights: Record<string, number>): number {
  const total = DIMS.reduce((s, d) => s + (weights[d.key] ?? 0), 0)
  if (total === 0) return 0
  return DIMS.reduce((s, d) => s + (scores[d.key] ?? 3) * (weights[d.key] ?? 0), 0) / total
}

function formatAvg(avg: number): string {
  return avg.toFixed(2)
}

function autoIncluded(scores: Record<string, number>, weights: Record<string, number>): boolean {
  return calcWeightedAvg(scores, weights) >= 4 && (scores['data'] ?? 3) >= 3
}

function trafficLight(scores: Record<string, number>, weights: Record<string, number>): 'green' | 'yellow' | 'red' {
  const avg = calcWeightedAvg(scores, weights)
  const data = scores['data'] ?? 3
  if (avg >= 4 && data >= 3) return 'green'
  if (avg >= 3) return 'yellow'
  return 'red'
}

function dotColor(light: 'green' | 'yellow' | 'red'): string {
  if (light === 'green') return 'bg-emerald-500'
  if (light === 'yellow') return 'bg-amber-400'
  return 'bg-red-400'
}

function toRows(processes: Process[], weights: Record<string, number>): ProcessRow[] {
  return processes.map((p) => {
    const scores = Object.fromEntries(
      DIMS.map((d) => [d.key, typeof p.scores?.[d.key] === 'number' ? p.scores[d.key] : 3])
    )
    return {
      name: p.name,
      scores,
      included: typeof p.included === 'boolean' ? p.included : autoIncluded(scores, weights),
    }
  })
}

export function Step2Prosessscoring({
  analyseId,
  analysisTitle,
  vcSteps,
  initialProcesses,
  initialWeights,
}: Props) {
  const router = useRouter()

  const [weights, setWeights] = useState<Record<string, number>>(initialWeights)
  const [rows, setRows] = useState<Record<string, ProcessRow[]>>(
    Object.fromEntries(
      vcSteps.map((vs) => [vs.id, toRows(initialProcesses[vs.id] ?? [], initialWeights)])
    )
  )
  const [activeTab, setActiveTab] = useState<string>(vcSteps[0]?.id ?? '')
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [aiDone, setAiDone] = useState<Record<string, boolean>>(
    Object.fromEntries(
      vcSteps.map((vs) => [vs.id, (initialProcesses[vs.id] ?? []).length > 0])
    )
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const weightTotal = Object.values(weights).reduce((s, v) => s + v, 0)
  const weightsValid = weightTotal === 100

  async function handleSelectTab(vsId: string, vsName: string) {
    setActiveTab(vsId)
    if (!aiDone[vsId] && !aiLoading[vsId]) {
      setAiLoading((prev) => ({ ...prev, [vsId]: true }))
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'steg2', vcStepName: vsName, analysisTitle }),
        })
        const json = await res.json()
        if (res.ok && Array.isArray(json.processes)) {
          setRows((prev) => ({
            ...prev,
            [vsId]: json.processes.map((name: string) => {
              const scores = defaultScores()
              return { name, scores, included: autoIncluded(scores, weights) }
            }),
          }))
        }
      } catch {
        // AI-feil er ikkje kritisk — brukaren kan legge til prosessar manuelt
      } finally {
        setAiLoading((prev) => ({ ...prev, [vsId]: false }))
        setAiDone((prev) => ({ ...prev, [vsId]: true }))
      }
    }
  }

  function updateName(vsId: string, i: number, value: string) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].map((r, idx) => (idx === i ? { ...r, name: value } : r)),
    }))
  }

  function updateScore(vsId: string, i: number, dimKey: string, value: number) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].map((r, idx) => {
        if (idx !== i) return r
        const newScores = { ...r.scores, [dimKey]: value }
        return { ...r, scores: newScores, included: autoIncluded(newScores, weights) }
      }),
    }))
  }

  function addRow(vsId: string) {
    const scores = defaultScores()
    setRows((prev) => ({
      ...prev,
      [vsId]: [...prev[vsId], { name: '', scores, included: autoIncluded(scores, weights) }],
    }))
  }

  function removeRow(vsId: string, i: number) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].filter((_, idx) => idx !== i),
    }))
  }

  function toggleIncluded(vsId: string, i: number) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)),
    }))
  }

  function updateWeight(key: string, value: number) {
    const newWeights = { ...weights, [key]: isNaN(value) ? 0 : value }
    setWeights(newWeights)
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([vsId, vsRows]) => [
          vsId,
          vsRows.map((r) => ({ ...r, included: autoIncluded(r.scores, newWeights) })),
        ])
      )
    )
  }

  async function handleNeste() {
    setSaveError(null)
    setSaving(true)

    const weightResult = await saveWeightsAction(analyseId, weights)
    if (!weightResult.success) {
      setSaveError(weightResult.error ?? 'Kunne ikkje lagre vekting')
      setSaving(false)
      return
    }

    for (const vs of vcSteps) {
      const result = await saveProcessesAction(analyseId, vs.id, rows[vs.id] ?? [])
      if (!result.success) {
        setSaveError(result.error ?? 'Kunne ikkje lagre prosessar')
        setSaving(false)
        return
      }
    }

    router.push(`/analyse/${analyseId}/steg/3`)
  }

  const activeRows = rows[activeTab] ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Vekting */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Vekting av dimensjonar</h2>
          <p className="text-sm text-slate-500">Fordel 100 poeng mellom dimensjonane.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {DIMS.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600" title={d.tip}>{d.label}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[d.key] ?? 0}
                onChange={(e) => updateWeight(d.key, parseInt(e.target.value))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#10B981] w-full"
              />
            </div>
          ))}
        </div>
        <p className={`text-sm font-medium ${weightsValid ? 'text-emerald-600' : 'text-red-600'}`}>
          Sum: {weightTotal} / 100 {weightsValid ? '✓' : '– må vere 100'}
        </p>
      </div>

      {/* Tab-navigasjon + scoringspanel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 pb-0 flex flex-col gap-2">
          <h2 className="text-base font-semibold text-[#1E293B]">Prosessar per verdikjedesteg</h2>
          <p className="text-sm text-slate-500">Velg eit verdikjedesteg, legg inn prosessar og gi score (1–5) på kvar dimensjon.</p>
          <p className="text-sm text-slate-500">Dei som tilrådast å ta med vidare har KI-eignetheit over 4 i snitt og 3 eller meir på datatilgjengelegheit. Desse er markerte nedst. For å ta med andre prosessar, klikk på dei i oppsummeringa nedst.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 mt-4 overflow-x-auto">
          {vcSteps.map((vs) => {
            const vsRows = rows[vs.id] ?? []
            const filledRows = vsRows.filter((r) => r.name.trim())
            const avgAll = filledRows.length > 0
              ? filledRows.reduce((s, r) => s + calcWeightedAvg(r.scores, weights), 0) / filledRows.length
              : null
            const isActive = vs.id === activeTab
            const light = avgAll !== null
              ? avgAll >= 4 ? 'green' : avgAll >= 3 ? 'yellow' : 'red'
              : null

            return (
              <button
                key={vs.id}
                onClick={() => handleSelectTab(vs.id, vs.name)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#10B981] text-[#10B981]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {light && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(light as 'green' | 'yellow' | 'red')}`} />
                )}
                {vs.name}
                {avgAll !== null && (
                  <span className="text-xs text-slate-400 font-normal">{formatAvg(avgAll)}</span>
                )}
                {aiLoading[vs.id] && (
                  <span className="text-xs text-slate-400 animate-pulse">...</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Aktivt tab-innhald */}
        <div className="p-6 flex flex-col gap-4">
          {activeRows.length === 0 && !aiLoading[activeTab] && (
            <p className="text-sm text-slate-400 italic">Ingen prosessar enno. Legg til manuelt.</p>
          )}
          {aiLoading[activeTab] && (
            <p className="text-sm text-slate-400 animate-pulse">Genererer prosessforslag...</p>
          )}

          {activeRows.map((row, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateName(activeTab, i, e.target.value)}
                  placeholder="Prosessnamn"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
                <button
                  onClick={() => removeRow(activeTab, i)}
                  className="text-slate-400 hover:text-red-500 transition-colors px-1"
                  title="Fjern prosess"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {DIMS.map((d) => (
                  <div key={d.key} className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 cursor-help" title={d.tip}>
                      {d.label}
                    </label>
                    <select
                      value={row.scores[d.key] ?? 3}
                      onChange={(e) => updateScore(activeTab, i, d.key, parseInt(e.target.value))}
                      className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 text-right">
                Vekta snitt:{' '}
                <span className="font-semibold text-[#1E293B]">
                  {formatAvg(calcWeightedAvg(row.scores, weights))}
                </span>
              </p>
            </div>
          ))}

          <button
            onClick={() => addRow(activeTab)}
            className="self-start text-sm text-[#3B82F6] hover:underline"
          >
            + Legg til prosess
          </button>
        </div>
      </div>

      {/* Tilrådingsoversikt */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Tilrådingsoversikt</h2>
          <p className="text-sm text-slate-500">Klikk ein prosess for å toggle om den skal takast med vidare.</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          {vcSteps.map((vs) => (
            <div key={vs.id} className="flex-1 min-w-[180px] flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{vs.name}</p>
              <div className="flex flex-col gap-1">
                {(rows[vs.id] ?? []).filter((r) => r.name.trim()).length === 0 && (
                  <p className="text-xs text-slate-400 italic">Ingen prosessar</p>
                )}
                {(rows[vs.id] ?? [])
                  .map((r, idx) => ({ r, idx }))
                  .filter(({ r }) => r.name.trim())
                  .map(({ r: row, idx }) => {
                    const light = trafficLight(row.scores, weights)
                    const avg = calcWeightedAvg(row.scores, weights)
                    const dimmed = !row.included
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleIncluded(vs.id, idx)}
                        className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          light === 'green'
                            ? dimmed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-400 line-through'
                              : 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium'
                            : light === 'yellow'
                            ? dimmed
                              ? 'border-amber-100 bg-amber-50 text-amber-300 line-through'
                              : 'border-amber-300 bg-amber-50 text-amber-700'
                            : dimmed
                            ? 'border-red-100 bg-red-50 text-red-300 line-through'
                            : 'border-red-300 bg-red-50 text-red-700'
                        }`}
                        title={`Snitt: ${formatAvg(avg)} | Data: ${row.scores['data'] ?? 3} | Klikk for å toggle`}
                      >
                        {row.name}
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 text-xs text-slate-500 mt-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Tilrådd (snitt ≥ 4 og data ≥ 3)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            Middels (snitt 3–4)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            Låg prioritet (snitt &lt; 3)
          </span>
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
      )}

      <div className="flex justify-between">
        <a
          href={`/analyse/${analyseId}/steg/1`}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          ← Førre steg
        </a>
        <Button
          onClick={handleNeste}
          disabled={!weightsValid || saving}
          className="bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50"
        >
          {saving ? 'Lagrar...' : 'Neste steg →'}
        </Button>
      </div>
    </div>
  )
}
