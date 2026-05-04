'use client'

import { useState, useEffect, useRef } from 'react'
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

function trunc(s: string, max = 22) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function DimTooltip({ label, tip }: { label: string; tip: string }) {
  const [show, setShow] = useState(false)
  const lines = tip.split('\n').filter(l => {
    const t = l.trim()
    return t.length > 0 && !t.match(/^Variab[a-z]*:\s*$/i)
  })
  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {label}
      {show && (
        <span
          className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none"
          style={{ width: '280px' }}
        >
          <span className="block bg-white rounded-lg p-3 text-left border border-slate-200 shadow-md">
            <span className="block text-xs font-bold text-[#1E293B] mb-2">Variablar:</span>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
            <span className="flex flex-col gap-1">
              {lines.map((line, i) => (
                <span key={i} className="block text-xs text-slate-500 leading-snug">{line}</span>
              ))}
            </span>
          </span>
        </span>
      )}
    </span>
  )
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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)
  const [scoreLoading, setScoreLoading] = useState<Record<string, boolean>>({})
  const [openedTabs, setOpenedTabs] = useState<Set<string>>(() => new Set(vcSteps[0]?.id ? [vcSteps[0].id] : []))
  const firstTabNeedsAI = useRef(false)

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
      for (const { vs, r } of allResults) {
        if (r.success && r.data && r.data.length > 0) {
          rowUpdates[vs.id] = toRows(r.data, fetchedWeights, [...DIMS])
        }
      }
      const first = vcSteps[0]
      firstTabNeedsAI.current = !!first && !rowUpdates[first.id]?.length
      setRows((prev) => ({ ...prev, ...rowUpdates }))
      setIsLoadingFromDB(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoadingFromDB) return
    const first = vcSteps[0]
    if (first && firstTabNeedsAI.current) {
      firstTabNeedsAI.current = false
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

  async function runAIScoresForTab(vsId: string, vsName: string, inputRows: ProcessRow[]) {
    const toScore = inputRows.filter(
      (row) =>
        row.name.trim().length > 0 &&
        row.ai_suggestion !== 'steg2scores' &&
        !Object.values(row.scores).every((v) => v > 3)
    )
    if (toScore.length === 0) return

    setScoreLoading((prev) => ({ ...prev, [vsId]: true }))

    let localRows = [...inputRows]
    let changed = false

    for (let i = 0; i < inputRows.length; i++) {
      const row = inputRows[i]
      if (!row.name.trim()) continue
      if (row.ai_suggestion === 'steg2scores') continue
      if (Object.values(row.scores).every((v) => v > 3)) continue

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'steg2scores',
            processName: row.name,
            vcStepName: vsName,
            analysisTitle,
            dimKeys: allDims.map((d) => d.key),
          }),
        })
        const json = await res.json() as Record<string, unknown>
        if (res.ok && json.scores && typeof json.scores === 'object') {
          const aiScores = json.scores as Record<string, number>
          const newScores = { ...localRows[i].scores, ...aiScores }
          const updatedRow: ProcessRow = {
            ...localRows[i],
            scores: newScores,
            included: autoIncluded(newScores, weights, allDims),
            ai_suggestion: 'steg2scores',
          }
          localRows = localRows.map((r, idx) => (idx === i ? updatedRow : r))
          setRows((prev) => ({
            ...prev,
            [vsId]: prev[vsId].map((r, idx) => (idx === i ? updatedRow : r)),
          }))
          changed = true
        }
      } catch {
        // AI-feil er ikkje kritisk
      }
    }

    if (changed) {
      await saveProcessesAction(analyseId, vsId, localRows)
    }
    setScoreLoading((prev) => ({ ...prev, [vsId]: false }))
  }

  async function handleSelectTab(vsId: string, vsName: string) {
    setOpenedTabs(prev => new Set(Array.from(prev).concat(vsId)))
    setActiveTab(vsId)
    const currentRows = rows[vsId] ?? []

    if (currentRows.length === 0 && !aiLoading[vsId] && !isLoadingFromDB) {
      setAiLoading((prev) => ({ ...prev, [vsId]: true }))
      let generated: ProcessRow[] = []
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'steg2', vcStepName: vsName, analysisTitle }),
        })
        const json = await res.json()
        if (res.ok && Array.isArray(json.processes)) {
          generated = (json.processes as string[]).map((name) => {
            const scores = defaultScores(allDims)
            return { name, scores, included: autoIncluded(scores, weights, allDims), ai_suggestion: 'steg2' }
          })
          setRows((prev) => ({ ...prev, [vsId]: generated }))
        }
      } catch {
        // AI-feil er ikkje kritisk — brukaren kan legge til prosessar manuelt
      } finally {
        setAiLoading((prev) => ({ ...prev, [vsId]: false }))
      }
      if (generated.length > 0) {
        await runAIScoresForTab(vsId, vsName, generated)
      }
    }
  }

  async function saveCurrentTab(vsId: string, vsRows: ProcessRow[]) {
    await saveProcessesAction(analyseId, vsId, vsRows)
  }

  async function updateName(vsId: string, i: number, value: string) {
    const updated = (rows[vsId] ?? []).map((r, idx) => (idx === i ? { ...r, name: value } : r))
    setRows((prev) => ({ ...prev, [vsId]: updated }))
    await saveCurrentTab(vsId, updated)
  }

  async function updateScore(vsId: string, i: number, dimKey: string, value: number) {
    const updated = (rows[vsId] ?? []).map((r, idx) => {
      if (idx !== i) return r
      const newScores = { ...r.scores, [dimKey]: value }
      return { ...r, scores: newScores, included: autoIncluded(newScores, weights, allDims) }
    })
    setRows((prev) => ({ ...prev, [vsId]: updated }))
    await saveCurrentTab(vsId, updated)
  }

  function addRow(vsId: string) {
    const scores = defaultScores(allDims)
    setRows((prev) => ({
      ...prev,
      [vsId]: [...prev[vsId], { name: '', scores, included: autoIncluded(scores, weights, allDims), ai_suggestion: null }],
    }))
  }

  async function removeRow(vsId: string, i: number) {
    const updated = (rows[vsId] ?? []).filter((_, idx) => idx !== i)
    setRows((prev) => ({ ...prev, [vsId]: updated }))
    await saveCurrentTab(vsId, updated)
  }

  async function toggleProcessIncluded(vsId: string, i: number) {
    const updated = (rows[vsId] ?? []).map((r, idx) => idx === i ? { ...r, included: !r.included } : r)
    setRows((prev) => ({ ...prev, [vsId]: updated }))
    await saveCurrentTab(vsId, updated)
  }

  async function updateWeight(key: string, value: number) {
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
    await saveWeightsAction(analyseId, newWeights)
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
      const vsRows = rows[vs.id] ?? []
      if (!vsRows.some((r) => r.name.trim().length > 0)) continue
      const result = await saveProcessesAction(analyseId, vs.id, vsRows)
      if (!result.success) {
        setSaveError(result.error ?? 'Kunne ikkje lagre prosessar')
        setSaving(false)
        return
      }
    }

    router.refresh()
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
      const vsRows = rows[vs.id] ?? []
      if (!vsRows.some((r) => r.name.trim().length > 0)) continue
      const result = await saveProcessesAction(analyseId, vs.id, vsRows)
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
  const allTabsOpened = vcSteps.every(vs => openedTabs.has(vs.id) || (rows[vs.id]?.length ?? 0) > 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Section A: Definer prosessar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 pb-0 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">A</span>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">Definer prosessar</h3>
              <p className="text-sm text-slate-500">Legg til prosessane for kvart verdikjedesteg og gi dei score. KI-forslag kjem automatisk når du vel eit steg.</p>
            </div>
          </div>
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

        {/* Active tab content */}
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
              {scoreLoading[activeTab] && (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-[#3B82F6] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm font-medium text-[#3B82F6]">Genererer KI-scores...</p>
                </div>
              )}

              {activeRows.map((row, i) => (
                <div key={i} className="border border-blue-100 bg-blue-50 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => setRows(prev => ({
                        ...prev,
                        [activeTab]: prev[activeTab].map((r2, idx) => idx === i ? { ...r2, name: e.target.value } : r2),
                      }))}
                      onBlur={(e) => void updateName(activeTab, i, e.target.value)}
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
                        <label className="text-xs text-slate-500">
                          <DimTooltip label={d.label} tip={d.tip} />
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

      {/* Section B: Vekting av variablar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">B</span>
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Vekting av variablar</h3>
            <p className="text-sm text-slate-500">Fordel 100 poeng mellom variablane. Hald over variabelnamnet for forklaring.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {allDims.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                <DimTooltip label={d.label} tip={d.tip} />
              </label>
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

      {/* Section C: Tilrådingsoversikt */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">C</span>
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Tilrådingsoversikt</h3>
            <p className="text-sm text-slate-500">Prosessar med snitt ≥ 4 og data ≥ 3 vert anbefalt vidare. Klikk for å endre inkludering.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {vcSteps.map((vs) => {
            const vsRows = rows[vs.id] ?? []
            const hasRows = vsRows.some((r) => r.name.trim())
            if (!hasRows) return null

            return (
              <div key={vs.id} className="flex flex-col gap-2">
                <div className="text-center text-sm font-bold text-[#1E293B] py-1 border-b border-slate-200">
                  {vs.name}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {vsRows.map((row, i) => {
                    if (!row.name.trim()) return null
                    const avg = calcWeightedAvg(row.scores, weights, allDims)
                    const isAutoThreshold = autoIncluded(row.scores, weights, allDims)
                    const state = row.included ? (isAutoThreshold ? 'auto' : 'manual') : 'excluded'
                    const boxStyle = {
                      auto:     { bg: '#D1FAE5', border: '2px solid #10B981' },
                      manual:   { bg: '#F0FDF4', border: '2px dashed #10B981' },
                      excluded: { bg: '#F8FAFC', border: '2px solid #E2E8F0' },
                    }[state]
                    const badgeStyle = {
                      auto:     { bg: '#D1FAE5', color: '#065F46', text: '✓ Inkludert' },
                      manual:   { bg: '#DCFCE7', color: '#166534', text: '✓ Manuelt inkludert' },
                      excluded: { bg: '#E2E8F0', color: '#64748B', text: 'Ikkje inkludert' },
                    }[state]
                    return (
                      <div
                        key={i}
                        onClick={() => toggleProcessIncluded(vs.id, i)}
                        className="cursor-pointer rounded-lg p-2 text-center transition-all"
                        style={{ background: boxStyle.bg, border: boxStyle.border, opacity: row.included ? 1 : 0.6 }}
                      >
                        <div className="text-[11px] font-bold leading-snug text-[#1E293B]">{trunc(row.name)}</div>
                        <div className="text-xs mt-1 text-slate-600">{formatAvg(avg)}</div>
                        <div
                          className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                        >
                          {badgeStyle.text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
        <div className="flex flex-col items-end gap-1">
          <Button
            onClick={handleNeste}
            disabled={!allTabsOpened || !weightsValid || saving}
            className="bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50"
          >
            {saving ? 'Lagrar...' : 'Neste steg →'}
          </Button>
          {!allTabsOpened && (
            <p className="text-xs text-slate-500">Opne alle fanene for å gå vidare</p>
          )}
        </div>
      </div>
    </div>
  )
}
