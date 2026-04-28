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

function toRows(processes: Process[]): ProcessRow[] {
  return processes.map((p) => ({
    name: p.name,
    scores: Object.fromEntries(
      DIMS.map((d) => [d.key, typeof p.scores?.[d.key] === 'number' ? p.scores[d.key] : 3])
    ),
  }))
}

function weightedAvg(scores: Record<string, number>, weights: Record<string, number>): string {
  const total = DIMS.reduce((s, d) => s + (weights[d.key] ?? 0), 0)
  if (total === 0) return '–'
  const avg = DIMS.reduce((s, d) => s + (scores[d.key] ?? 3) * (weights[d.key] ?? 0), 0) / total
  return avg.toFixed(2)
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
      vcSteps.map((vs) => [vs.id, toRows(initialProcesses[vs.id] ?? [])])
    )
  )
  const [open, setOpen] = useState<Record<string, boolean>>({})
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

  async function handleToggle(vsId: string, vsName: string) {
    const isOpen = !open[vsId]
    setOpen((prev) => ({ ...prev, [vsId]: isOpen }))

    if (isOpen && !aiDone[vsId] && !aiLoading[vsId]) {
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
            [vsId]: json.processes.map((name: string) => ({ name, scores: defaultScores() })),
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
      [vsId]: prev[vsId].map((r, idx) =>
        idx === i ? { ...r, scores: { ...r.scores, [dimKey]: value } } : r
      ),
    }))
  }

  function addRow(vsId: string) {
    setRows((prev) => ({
      ...prev,
      [vsId]: [...prev[vsId], { name: '', scores: defaultScores() }],
    }))
  }

  function removeRow(vsId: string, i: number) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].filter((_, idx) => idx !== i),
    }))
  }

  function updateWeight(key: string, value: number) {
    setWeights((prev) => ({ ...prev, [key]: isNaN(value) ? 0 : value }))
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

      {/* Accordion per vc_step */}
      <div className="flex flex-col gap-3">
        {vcSteps.map((vs) => (
          <div key={vs.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => handleToggle(vs.id, vs.name)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-[#1E293B]">{vs.name}</span>
              <span className="flex items-center gap-2 text-sm text-slate-500">
                {aiLoading[vs.id] && (
                  <span className="text-xs text-slate-400 animate-pulse">Genererer...</span>
                )}
                <span className="text-slate-400">{rows[vs.id]?.length ?? 0} prosessar</span>
                <span className="text-slate-400">{open[vs.id] ? '▲' : '▼'}</span>
              </span>
            </button>

            {open[vs.id] && (
              <div className="border-t border-slate-100 p-6 flex flex-col gap-4">
                {rows[vs.id]?.length === 0 && !aiLoading[vs.id] && (
                  <p className="text-sm text-slate-400 italic">Ingen prosessar enno. Legg til manuelt.</p>
                )}

                {rows[vs.id]?.map((row, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateName(vs.id, i, e.target.value)}
                        placeholder="Prosessnamn"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                      />
                      <button
                        onClick={() => removeRow(vs.id, i)}
                        className="text-slate-400 hover:text-red-500 transition-colors px-1"
                        title="Fjern prosess"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {DIMS.map((d) => (
                        <div key={d.key} className="flex flex-col gap-1">
                          <label
                            className="text-xs text-slate-500 cursor-help"
                            title={d.tip}
                          >
                            {d.label}
                          </label>
                          <select
                            value={row.scores[d.key] ?? 3}
                            onChange={(e) => updateScore(vs.id, i, d.key, parseInt(e.target.value))}
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
                      Vekta snitt: <span className="font-semibold text-[#1E293B]">{weightedAvg(row.scores, weights)}</span>
                    </p>
                  </div>
                ))}

                <button
                  onClick={() => addRow(vs.id)}
                  className="self-start text-sm text-[#3B82F6] hover:underline"
                >
                  + Legg til prosess
                </button>
              </div>
            )}
          </div>
        ))}
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
