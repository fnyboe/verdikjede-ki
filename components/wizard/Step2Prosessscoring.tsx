'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProcessesForVcStepAction, getWeightsAction, saveProcessesAction, saveWeightsAction } from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import { DIMS } from '@/lib/constants'
import type { VcStep, Process, Dim } from '@/types'

interface ProcessRow {
  name: string
  scores: Record<string, number>
  included: boolean
  ai_suggestion: string | null
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  operational: 20, process: 20, data: 20, risk: 20, change: 20,
}

interface Props {
  analyseId: string
  analysisTitle: string
  vcSteps: VcStep[]
}

function defaultScores(allDims: Dim[]): Record<string, number> {
  return Object.fromEntries(allDims.map((d) => [d.key, 3]))
}

function calcWeightedAvg(scores: Record<string, number>, weights: Record<string, number>, allDims: Dim[]): number {
  const total = allDims.reduce((s, d) => s + (weights[d.key] ?? 0), 0)
  if (total === 0) return 0
  return allDims.reduce((s, d) => s + (scores[d.key] ?? 3) * (weights[d.key] ?? 0), 0) / total
}

function formatAvg(avg: number): string {
  return avg.toFixed(2)
}

function autoIncluded(scores: Record<string, number>, weights: Record<string, number>, allDims: Dim[]): boolean {
  return calcWeightedAvg(scores, weights, allDims) >= 4 && (scores['data'] ?? 3) >= 3
}

function stepTrafficLight(vsRows: ProcessRow[], weights: Record<string, number>, allDims: Dim[]): 'green' | 'yellow' | 'red' {
  const filled = vsRows.filter((r) => r.name.trim())
  if (filled.length === 0) return 'yellow'
  const avg = filled.reduce((s, r) => s + calcWeightedAvg(r.scores, weights, allDims), 0) / filled.length
  const dataAvg = filled.reduce((s, r) => s + (r.scores['data'] ?? 3), 0) / filled.length
  if (avg >= 4 && dataAvg >= 3) return 'green'
  if (avg >= 3) return 'yellow'
  return 'red'
}

function dotColor(light: 'green' | 'yellow' | 'red'): string {
  if (light === 'green') return 'bg-emerald-500'
  if (light === 'yellow') return 'bg-amber-400'
  return 'bg-red-400'
}

function toRows(processes: Process[], weights: Record<string, number>, allDims: Dim[]): ProcessRow[] {
  return processes.map((p) => {
    const scores = Object.fromEntries(
      allDims.map((d) => [d.key, typeof p.scores?.[d.key] === 'number' ? p.scores[d.key] : 3])
    )
    return {
      name: p.name,
      scores,
      included: typeof p.included === 'boolean' ? p.included : autoIncluded(scores, weights, allDims),
      ai_suggestion: p.ai_suggestion ?? null,
    }
  })
}

export function Step2Prosessscoring({
  analyseId,
  analysisTitle,
  vcSteps,
}: Props) {
  const router = useRouter()

  const [customDims, setCustomDims] = useState<Dim[]>([])
  const [newDimLabel, setNewDimLabel] = useState('')
  const [newDimTip, setNewDimTip] = useState('')
  const [showAddDim, setShowAddDim] = useState(false)

  const allDims: Dim[] = [...DIMS, ...customDims]

  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [rows, setRows] = useState<Record<string, ProcessRow[]>>(
    Object.fromEntries(vcSteps.map((vs) => [vs.id, []]))
  )
  const [activeTab, setActiveTab] = useState<string>(vcSteps[0]?.id ?? '')
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [aiDone, setAiDone] = useState<Record<string, boolean>>(
    Object.fromEntries(vcSteps.map((vs) => [vs.id, false]))
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)

  useEffect(() => {
    Promise.all([
      getWeightsAction(analyseId),
      Promise.all(vcSteps.map((vs) => getProcessesForVcStepAction(vs.id).then((r) => ({ vs, r })))),
    ]).then(([weightsResult, allResults]) => {
      const fetchedWeights =
        weightsResult.success && weightsResult.data && Object.keys(weightsResult.data).length > 0
          ? weightsResult.data
          : DEFAULT_WEIGHTS
      setWeights(fetchedWeights)

      const rowUpdates: Record<string, ProcessRow[]> = {}
      const aiDoneUpdates: Record<string, boolean> = {}
      for (const { vs, r } of allResults) {
        if (r.success && r.data && r.data.length > 0) {
          rowUpdates[vs.id] = toRows(r.data, fetchedWeights, [...DIMS])
          if (r.data.some((p) => p.ai_suggestion !== null)) {
            aiDoneUpdates[vs.id] = true
          }
        }
      }
      setRows((prev) => ({ ...prev, ...rowUpdates }))
      setAiDone((prev) => ({ ...prev, ...aiDoneUpdates }))
      setIsLoadingFromDB(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoadingFromDB) return
    const first = vcSteps[0]
    if (first && (rows[first.id] ?? []).length === 0) {
      handleSelectTab(first.id, first.name)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingFromDB])

  const weightTotal = Object.values(weights).reduce((s, v) => s + v, 0)
  const weightsValid = weightTotal === 100

  function addCustomDim() {
    if (!newDimLabel.trim() || customDims.length >= 2) return
    const key = `custom_${customDims.length}`
    const newDim: Dim = { key, label: newDimLabel.trim(), tip: newDimTip.trim() }
    setCustomDims((prev) => [...prev, newDim])
    setWeights((prev) => ({ ...prev, [key]: 10 }))
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([vsId, vsRows]) => [
          vsId,
          vsRows.map((r) => ({ ...r, scores: { ...r.scores, [key]: 3 } })),
        ])
      )
    )
    setNewDimLabel('')
    setNewDimTip('')
    setShowAddDim(false)
  }

  async function handleSelectTab(vsId: string, vsName: string) {
    setActiveTab(vsId)
    if ((rows[vsId] ?? []).length === 0 && !aiLoading[vsId] && !isLoadingFromDB) {
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
              const scores = defaultScores(allDims)
              return { name, scores, included: autoIncluded(scores, weights, allDims), ai_suggestion: 'steg2' }
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
        return { ...r, scores: newScores, included: autoIncluded(newScores, weights, allDims) }
      }),
    }))
  }

  function addRow(vsId: string) {
    const scores = defaultScores(allDims)
    setRows((prev) => ({
      ...prev,
      [vsId]: [...prev[vsId], { name: '', scores, included: autoIncluded(scores, weights, allDims), ai_suggestion: null }],
    }))
  }

  function removeRow(vsId: string, i: number) {
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].filter((_, idx) => idx !== i),
    }))
  }

  function toggleStepIncluded(vsId: string) {
    const vsRows = rows[vsId] ?? []
    const filled = vsRows.filter((r) => r.name.trim())
    const allIncluded = filled.length > 0 && filled.every((r) => r.included)
    setRows((prev) => ({
      ...prev,
      [vsId]: prev[vsId].map((r) => ({ ...r, included: !allIncluded })),
    }))
  }

  function updateWeight(key: string, value: number) {
    const newWeights = { ...weights, [key]: isNaN(value) ? 0 : value }
    setWeights(newWeights)
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([vsId, vsRows]) => [
          vsId,
          vsRows.map((r) => ({ ...r, included: autoIncluded(r.scores, newWeights, allDims) })),
        ])
      )
    )
  }

  async function handleForrige() {
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

    router.push(`/analyse/${analyseId}/steg/1`)
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

    router.refresh()
    router.push(`/analyse/${analyseId}/steg/3`)
  }

  const activeRows = rows[activeTab] ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Vekting av variablar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Vekting av variablar</h2>
          <p className="text-sm text-slate-500">Fordel 100 poeng mellom variablane.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {allDims.map((d) => (
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className={`text-sm font-medium ${weightsValid ? 'text-emerald-600' : 'text-red-600'}`}>
            Sum: {weightTotal} / 100 {weightsValid ? '✓' : '– må vere 100'}
          </p>
          {customDims.length < 2 && (
            <button
              onClick={() => setShowAddDim((v) => !v)}
              className="text-sm text-[#3B82F6] hover:underline"
            >
              + Legg til variabel
            </button>
          )}
        </div>

        {showAddDim && (
          <div className="flex flex-col gap-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600">Ny variabel (maks 2 eigne)</p>
            <input
              type="text"
              value={newDimLabel}
              onChange={(e) => setNewDimLabel(e.target.value)}
              placeholder="Namn på variabel *"
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
            <input
              type="text"
              value={newDimTip}
              onChange={(e) => setNewDimTip(e.target.value)}
              placeholder="Beskriving / tooltip (valfritt)"
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
            <div className="flex gap-2">
              <button
                onClick={addCustomDim}
                disabled={!newDimLabel.trim()}
                className="text-sm bg-[#1E293B] text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                Legg til
              </button>
              <button
                onClick={() => setShowAddDim(false)}
                className="text-sm text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Avbryt
              </button>
            </div>
            <p className="text-xs text-slate-400">Ny variabel får vekt 10 — juster summen til 100 etterpå.</p>
          </div>
        )}
      </div>

      {/* Tab-navigasjon + scoringspanel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 pb-0 flex flex-col gap-2">
          <h2 className="text-base font-semibold text-[#1E293B]">Prosessar per verdikjedesteg</h2>
          <p className="text-sm text-slate-500">Velg eit verdikjedesteg, legg inn prosessar og gi score (1–5) på kvar variabel.</p>
          <p className="text-sm text-slate-500">Dei som tilrådast å ta med vidare har KI-eignetheit over 4 i snitt og 3 eller meir på datatilgjengelegheit. Desse er markerte nedst. For å ta med andre prosessar, klikk på dei i oppsummeringa nedst.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 mt-4 overflow-x-auto">
          {vcSteps.map((vs) => {
            const vsRows = rows[vs.id] ?? []
            const filledRows = vsRows.filter((r) => r.name.trim())
            const avgAll = filledRows.length > 0
              ? filledRows.reduce((s, r) => s + calcWeightedAvg(r.scores, weights, allDims), 0) / filledRows.length
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
          {isLoadingFromDB ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#10B981] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-[#10B981]">Lastar prosessar...</p>
            </div>
          ) : (
            <>
          {activeRows.length === 0 && !aiLoading[activeTab] && (
            <p className="text-sm text-slate-400 italic">Ingen prosessar enno. Legg til manuelt.</p>
          )}
          {aiLoading[activeTab] && (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-[#10B981] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium text-[#10B981]">Genererer prosessforslag...</p>
            </div>
          )}

          {activeRows.map((row, i) => (
            <div key={i} className="border border-blue-100 bg-blue-50 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateName(activeTab, i, e.target.value)}
                  placeholder="Prosessnamn"
                  className="flex-1 border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                {allDims.map((d) => (
                  <div key={d.key} className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 cursor-help" title={d.tip}>
                      {d.label}
                    </label>
                    <select
                      value={row.scores[d.key] ?? 3}
                      onChange={(e) => updateScore(activeTab, i, d.key, parseInt(e.target.value))}
                      className="border border-slate-300 bg-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
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
                  {formatAvg(calcWeightedAvg(row.scores, weights, allDims))}
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
            </>
          )}
        </div>
      </div>

      {/* Tilrådingsoversikt */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Tilrådingsoversikt</h2>
          <p className="text-sm text-slate-500">Klikk eit kort for å toggle om heile verdikjedesteget skal takast med vidare.</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          {vcSteps.map((vs) => {
            const vsRows = rows[vs.id] ?? []
            const filled = vsRows.filter((r) => r.name.trim())
            const light = stepTrafficLight(vsRows, weights, allDims)
            const avg = filled.length > 0
              ? filled.reduce((s, r) => s + calcWeightedAvg(r.scores, weights, allDims), 0) / filled.length
              : null
            const allIncluded = filled.length > 0 && filled.every((r) => r.included)

            const cardClass = light === 'green'
              ? allIncluded
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-emerald-200 bg-emerald-50 opacity-50'
              : light === 'yellow'
              ? allIncluded
                ? 'border-amber-300 bg-amber-50'
                : 'border-amber-100 bg-amber-50 opacity-50'
              : allIncluded
              ? 'border-red-300 bg-red-50'
              : 'border-red-100 bg-red-50 opacity-50'

            const labelClass = light === 'green'
              ? 'text-emerald-800'
              : light === 'yellow'
              ? 'text-amber-800'
              : 'text-red-800'

            return (
              <button
                key={vs.id}
                onClick={() => toggleStepIncluded(vs.id)}
                className={`flex-1 min-w-[160px] text-left rounded-xl border-2 p-4 flex flex-col gap-2 transition-all hover:shadow-sm ${cardClass}`}
                title="Klikk for å toggle inkludering"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor(light)}`} />
                  <span className={`text-sm font-semibold ${labelClass}`}>{vs.name}</span>
                </div>
                {avg !== null && (
                  <p className={`text-xs ${labelClass}`}>
                    Snitt: <span className="font-bold">{formatAvg(avg)}</span>
                  </p>
                )}
                <p className="text-xs text-slate-500">{filled.length} prosess{filled.length !== 1 ? 'ar' : ''}</p>
                <p className={`text-xs font-medium mt-1 ${allIncluded ? 'text-slate-700' : 'text-slate-400'}`}>
                  {allIncluded ? '✓ Inkludert' : '✕ Ikkje inkludert'}
                </p>
              </button>
            )
          })}
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
        <Button
          onClick={handleForrige}
          disabled={saving || isLoadingFromDB}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50"
        >
          {saving ? 'Lagrar...' : '← Førre steg'}
        </Button>
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
