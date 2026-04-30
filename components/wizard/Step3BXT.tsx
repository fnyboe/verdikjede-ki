'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BXT_CATS } from '@/lib/constants'
import {
  getProcessesForVcStepAction,
  saveBxtDataAction,
  saveProcessIncludedAction,
} from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import type { VcStep, Process } from '@/types'

interface BxtEntry {
  problem_desc: string
  usecase_desc: string
  business_goal: string
  key_results: string
  responsible: string
  bxt_scores: Record<string, number | string>
}

interface Props {
  analyseId: string
  analysisTitle: string
  vcSteps: VcStep[]
}

const S_KEYS = ['alignment', 'biz_strategy', 'biz_value', 'biz_timeline']
const F_KEYS = ['exp_personas', 'exp_value', 'exp_resistance', 'tech_risk', 'tech_security', 'tech_fit']
const PLOT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

function bxtAgg(bxt: Record<string, number | string>) {
  const sA = S_KEYS.reduce((a, k) => a + Number(bxt[k] ?? 3), 0) / S_KEYS.length
  const fA = F_KEYS.reduce((a, k) => a + Number(bxt[k] ?? 3), 0) / F_KEYS.length
  const total = (sA + fA) / 2
  return {
    sA: Math.round(sA * 10) / 10,
    fA: Math.round(fA * 10) / 10,
    total: Math.round(total * 10) / 10,
  }
}

function simpleAvg(scores: Record<string, number>) {
  const vals = Object.values(scores).filter(v => v > 0)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
}

function trunc(s: string, max = 22) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

function getScoreColor(v: number) {
  const r = (v - 1) / 4
  if (r >= 0.66) return { dot: '#10B981', bg: '#D1FAE5', text: '#065F46' }
  if (r >= 0.33) return { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E' }
  return { dot: '#EF4444', bg: '#FEE2E2', text: '#991B1B' }
}

type PlotProcess = Process & { sA: number; fA: number; total: number; vcColor: string; vcName: string }

function ScatterPlot({ processes, showLabels }: { processes: PlotProcess[]; showLabels: boolean }) {
  const W = 560
  const H = 440
  const PAD = 56
  const PADT = 30
  const cW = W - PAD * 2
  const cH = H - PAD - PADT

  const tx = (v: number) => PAD + (v / 5) * cW
  const ty = (v: number) => PADT + cH - (v / 5) * cH

  const [tooltip, setTooltip] = useState<{ name: string; vcName: string; cx: number; cy: number } | null>(null)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "'DM Sans',sans-serif", overflow: 'visible' }}>
      <defs>
        <filter id="tt-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000018" />
        </filter>
      </defs>

      {/* Quadrant backgrounds — divided at score 3 */}
      <rect x={tx(0)} y={ty(5)} width={tx(3) - tx(0)} height={ty(3) - ty(5)} fill="#FEF9C3" opacity="0.5" />
      <rect x={tx(3)} y={ty(5)} width={tx(5) - tx(3)} height={ty(3) - ty(5)} fill="#DBEAFE" opacity="0.5" />
      <rect x={tx(0)} y={ty(3)} width={tx(3) - tx(0)} height={ty(0) - ty(3)} fill="#FEE2E2" opacity="0.5" />
      <rect x={tx(3)} y={ty(3)} width={tx(5) - tx(3)} height={ty(0) - ty(3)} fill="#D1FAE5" opacity="0.5" />

      {/* Midlines at score 3 */}
      <line x1={tx(3)} y1={ty(5)} x2={tx(3)} y2={ty(0)} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6,4" />
      <line x1={tx(0)} y1={ty(3)} x2={tx(5)} y2={ty(3)} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6,4" />

      {/* Axis ticks */}
      {[1, 2, 3, 4, 5].map(v => (
        <g key={v}>
          <text x={tx(v)} y={ty(0) + 16} textAnchor="middle" fontSize={8} fill="#94A3B8">{v}</text>
          <text x={PAD - 10} y={ty(v) + 4} textAnchor="end" fontSize={8} fill="#94A3B8">{v}</text>
        </g>
      ))}
      <text x={tx(0)} y={ty(0) + 16} textAnchor="middle" fontSize={8} fill="#94A3B8">0</text>

      {/* Quadrant labels */}
      <text x={tx(0) + 8} y={ty(5) + 16} fontSize={10} fontWeight="700" fill="#D97706">Utforsk videre</text>
      <text x={tx(0) + 8} y={ty(5) + 28} fontSize={10} fontWeight="700" fill="#D97706">(seinare)</text>
      <text x={tx(3) + 8} y={ty(5) + 16} fontSize={10} fontWeight="700" fill="#3B82F6">Utfør</text>
      <text x={tx(3) + 8} y={ty(5) + 28} fontSize={10} fontWeight="700" fill="#3B82F6">oppgåveanalyse</text>
      <text x={tx(0) + 8} y={ty(3) + 16} fontSize={10} fontWeight="700" fill="#EF4444">Sett på vent</text>
      <text x={tx(3) + 8} y={ty(3) + 16} fontSize={10} fontWeight="700" fill="#10B981">Inkuber</text>
      <text x={tx(3) + 8} y={ty(3) + 28} fontSize={10} fontWeight="700" fill="#10B981">(utvikle seinare)</text>

      {/* Axis labels */}
      <text x={tx(2.5)} y={ty(0) + 26} textAnchor="middle" fontSize={10} fontWeight="700" fill="#475569">
        Grad av gjennomførbarheit
      </text>
      <text
        x={18}
        y={ty(2.5)}
        textAnchor="middle"
        fontSize={10}
        fontWeight="700"
        fill="#475569"
        transform={`rotate(-90, 18, ${ty(2.5)})`}
      >
        Grad av strategisk forretningseffekt
      </text>

      {/* Process dots — labels when filtered, tooltip when Alle */}
      {processes.map(p => {
        const cx = tx(p.fA)
        const cy = ty(p.sA)
        return (
          <g
            key={p.id}
            onMouseOver={showLabels ? undefined : () => setTooltip({ name: p.name, vcName: p.vcName, cx, cy })}
            onMouseOut={showLabels ? undefined : () => setTooltip(null)}
            style={{ cursor: showLabels ? 'default' : 'pointer' }}
          >
            <circle cx={cx} cy={cy} r={4} fill={p.vcColor} stroke="#fff" strokeWidth={2} />
            {showLabels && (
              <text x={cx + 8} y={cy + 4} fontSize={6} fill="#1E293B">{p.name}</text>
            )}
          </g>
        )
      })}

      {/* Tooltip — only in Alle-mode */}
      {!showLabels && tooltip !== null && (() => {
        const TW = 220, TH = 38, TP = 7
        const ttx = Math.min(tooltip.cx + 10, W - TW - 4)
        const tty = Math.max(tooltip.cy - TH - 6, 4)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={ttx} y={tty} width={TW} height={TH} rx={4} fill="white" stroke="#E2E8F0" strokeWidth={1} filter="url(#tt-shadow)" />
            <text x={ttx + TP} y={tty + 14} fontSize={9} fontWeight="700" fill="#1E293B">{tooltip.name}</text>
            <text x={ttx + TP} y={tty + 28} fontSize={8} fill="#64748B">{tooltip.vcName}</text>
          </g>
        )
      })()}
    </svg>
  )
}

export function Step3BXT({ analyseId, analysisTitle, vcSteps }: Props) {
  const router = useRouter()
  const vcStepNames = Object.fromEntries(vcSteps.map(vs => [vs.id, vs.name]))

  const [processes, setProcesses] = useState<Process[]>([])
  const [activeVcId, setActiveVcId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, 'problem' | 'bxt'>>({})
  const [entries, setEntries] = useState<Record<string, BxtEntry>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [problemChanged, setProblemChanged] = useState<Record<string, boolean>>({})
  const [saveError, setSaveError] = useState<Record<string, string | null>>({})
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)
  const [step2Included, setStep2Included] = useState<Record<string, boolean>>({})
  const [plotFilter, setPlotFilter] = useState<string | null>(null)

  useEffect(() => {
    Promise.all(vcSteps.map(vs => getProcessesForVcStepAction(vs.id))).then(results => {
      const allProcs: Process[] = []
      const s2inc: Record<string, boolean> = {}
      for (const r of results) {
        if (r.success && r.data) allProcs.push(...r.data.map(p => {
          const bxt = (p.bxt_scores ?? {}) as Record<string, number | string>
          const bxtScored = S_KEYS.some(k => k in bxt) || F_KEYS.some(k => k in bxt)
          s2inc[p.id] = p.included
          return { ...p, included: bxtScored && bxtAgg(bxt).total >= 4 }
        }))
      }
      setProcesses(allProcs)
      setStep2Included(s2inc)
      const initEntries: Record<string, BxtEntry> = {}
      for (const p of allProcs) {
        initEntries[p.id] = {
          problem_desc: p.problem_desc ?? '',
          usecase_desc: p.usecase_desc ?? '',
          business_goal: p.business_goal ?? '',
          key_results: p.key_results ?? '',
          responsible: p.responsible ?? '',
          bxt_scores: (p.bxt_scores ?? {}) as Record<string, number | string>,
        }
      }
      setEntries(initEntries)
      const firstVc =
        vcSteps.find(vs => allProcs.some(p => p.vc_step_id === vs.id && s2inc[p.id])) ??
        vcSteps.find(vs => allProcs.some(p => p.vc_step_id === vs.id))
      if (firstVc) setActiveVcId(firstVc.id)
      setIsLoadingFromDB(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // vc_steps that have at least one included process, with tab score and plot colour
  const vcGroups = vcSteps
    .map((vs, idx) => {
      const procs = processes.filter(p => p.vc_step_id === vs.id)
      if (!procs.length) return null
      const tabScore = Math.round(
        procs.reduce((s, p) => s + simpleAvg(p.scores), 0) / procs.length * 10
      ) / 10
      return { vs, procs, tabScore, color: PLOT_COLORS[idx % PLOT_COLORS.length] }
    })
    .filter((g): g is { vs: VcStep; procs: Process[]; tabScore: number; color: string } => g !== null)

  const vcColorMap: Record<string, string> = Object.fromEntries(
    vcGroups.map(({ vs, color }) => [vs.id, color])
  )

  const activeProcs = processes.filter(p => p.vc_step_id === activeVcId)

  // Scatter plot covers ALL included processes across all vc_steps, coloured by vc_step
  const plotProcesses: PlotProcess[] = processes.map(p => ({
    ...p,
    ...bxtAgg((entries[p.id]?.bxt_scores ?? {}) as Record<string, number | string>),
    vcColor: vcColorMap[p.vc_step_id ?? ''] ?? '#1E293B',
    vcName: vcStepNames[p.vc_step_id ?? ''] ?? '',
  }))

  const legendItems = vcGroups.map(({ vs, color }) => ({ id: vs.id, name: vs.name, color }))

  const filteredPlotProcesses = plotFilter
    ? plotProcesses.filter(p => p.vc_step_id === plotFilter)
    : plotProcesses

  // Shared AI call for problem/usecase — returns generated text so handleOpen can pass it to runAIForScores
  async function runAIForProcess(process: Process): Promise<{ problem: string; ideas: string } | null> {
    const vsName = vcStepNames[process.vc_step_id ?? ''] ?? ''
    setAiLoading(prev => ({ ...prev, [process.id]: true }))
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg3', processName: process.name, vcStepName: vsName, analysisTitle }),
      })
      const json = await res.json() as Record<string, unknown>
      if (res.ok && typeof json.problem === 'string' && typeof json.ideas === 'string') {
        const cached = JSON.stringify({ problem: json.problem, ideas: json.ideas })
        const currentEntry = entries[process.id] ?? {
          problem_desc: '', usecase_desc: '', business_goal: '', key_results: '', responsible: '', bxt_scores: {},
        }
        const updatedEntry: BxtEntry = { ...currentEntry, problem_desc: json.problem, usecase_desc: json.ideas }
        setEntries(prev => ({ ...prev, [process.id]: updatedEntry }))
        setProcesses(prev => prev.map(p =>
          p.id === process.id
            ? { ...p, problem_desc: json.problem as string, usecase_desc: json.ideas as string, ai_suggestion: cached }
            : p
        ))
        await saveBxtDataAction(process.id, { ...updatedEntry, ai_suggestion: cached })
        return { problem: json.problem, ideas: json.ideas }
      }
    } catch {
      // AI error non-critical
    } finally {
      setAiLoading(prev => ({ ...prev, [process.id]: false }))
    }
    return null
  }

  async function runAIForScores(process: Process, problemDesc: string, usecaseDesc: string) {
    setAiLoading(prev => ({ ...prev, [process.id]: true }))
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg3scores', processName: process.name, problemDesc, usecaseDesc }),
      })
      const json = await res.json() as Record<string, unknown>
      if (res.ok && json.scores && typeof json.scores === 'object') {
        const aiScores = json.scores as Record<string, number>
        setEntries(prev => ({
          ...prev,
          [process.id]: {
            ...(prev[process.id] ?? {
              problem_desc: problemDesc, usecase_desc: usecaseDesc,
              business_goal: '', key_results: '', responsible: '', bxt_scores: {},
            }),
            bxt_scores: {
              ...((prev[process.id]?.bxt_scores ?? {}) as Record<string, number | string>),
              ...aiScores,
            },
          },
        }))
        // Build entry for DB save using params for problem/usecase (avoids stale closure)
        const stale = entries[process.id]
        const entryForSave: BxtEntry = {
          problem_desc: problemDesc,
          usecase_desc: usecaseDesc,
          business_goal: stale?.business_goal ?? '',
          key_results: stale?.key_results ?? '',
          responsible: stale?.responsible ?? '',
          bxt_scores: { ...(stale?.bxt_scores ?? {}), ...aiScores },
        }
        const aiSuggestion = processes.find(p => p.id === process.id)?.ai_suggestion ?? null
        await saveBxtDataAction(process.id, { ...entryForSave, ai_suggestion: aiSuggestion })
      }
    } catch {
      // AI error non-critical
    } finally {
      setAiLoading(prev => ({ ...prev, [process.id]: false }))
    }
  }

  async function handleOpen(process: Process) {
    if (!(step2Included[process.id] ?? false)) return
    if (openId === process.id) { setOpenId(null); return }
    setOpenId(process.id)
    setActiveTab(prev => ({ ...prev, [process.id]: prev[process.id] ?? 'problem' }))

    // Step 1: problem/usecase AI
    const entry = entries[process.id]
    let problemDesc = entry?.problem_desc || process.problem_desc || ''
    let usecaseDesc = entry?.usecase_desc || process.usecase_desc || ''

    if (!problemDesc || !usecaseDesc) {
      const result = await runAIForProcess(process)
      if (result) {
        problemDesc = result.problem
        usecaseDesc = result.ideas
      }
    }

    // Step 2: BXT scores AI — skip if any score key already set in DB
    const bxt = (process.bxt_scores ?? {}) as Record<string, number | string>
    const bxtScored = S_KEYS.some(k => k in bxt) || F_KEYS.some(k => k in bxt)
    if (!bxtScored) {
      await runAIForScores(process, problemDesc, usecaseDesc)
    }
  }

  async function handleRegenerateAI(process: Process) {
    setProblemChanged(prev => ({ ...prev, [process.id]: false }))
    await runAIForProcess(process)
  }

  async function handleAutoSave(processId: string) {
    const entry = entries[processId]
    if (!entry) return
    setSaving(prev => ({ ...prev, [processId]: true }))
    const aiSuggestion = processes.find(p => p.id === processId)?.ai_suggestion ?? null
    const result = await saveBxtDataAction(processId, { ...entry, ai_suggestion: aiSuggestion })
    setSaveError(prev => ({ ...prev, [processId]: result.success ? null : (result.error ?? 'Kunne ikkje lagre') }))
    setSaving(prev => ({ ...prev, [processId]: false }))
  }

  async function handleToggleIncluded(processId: string) {
    const p = processes.find(x => x.id === processId)
    if (!p) return
    const newIncluded = !p.included
    setProcesses(prev => prev.map(x => x.id === processId ? { ...x, included: newIncluded } : x))
    await saveProcessIncludedAction(processId, newIncluded)
  }

  function setScore(processId: string, key: string, value: number) {
    setEntries(prev => ({
      ...prev,
      [processId]: { ...prev[processId], bxt_scores: { ...prev[processId].bxt_scores, [key]: value } },
    }))
  }

  function setComment(processId: string, key: string, value: string) {
    setEntries(prev => ({
      ...prev,
      [processId]: { ...prev[processId], bxt_scores: { ...prev[processId].bxt_scores, [`${key}_comment`]: value } },
    }))
  }

  function setTextField(processId: string, field: keyof Omit<BxtEntry, 'bxt_scores'>, value: string) {
    setEntries(prev => ({ ...prev, [processId]: { ...prev[processId], [field]: value } }))
    if (field === 'problem_desc') {
      const hasAi = processes.some(p => p.id === processId && p.ai_suggestion)
      if (hasAi) setProblemChanged(prev => ({ ...prev, [processId]: true }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {isLoadingFromDB ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-[#10B981] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-[#10B981]">Lastar prosessar...</p>
        </div>
      ) : processes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Ingen inkluderte prosessar funne. Gå tilbake til steg 2 og merk prosessar som inkludert.
        </div>
      ) : (
        <>
          {/* Del A — Vurder kvar prosess */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">A</span>
              <h3 className="text-base font-bold text-[#1E293B]">Vurder kvar prosess</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-slate-500">Her er prosessane du tok med vidare frå den objektive vurderinga i steg 2. Score frå steg 2 er vist i parentes.</p>
              <p className="text-sm text-slate-500">Opne kvar prosess for KI-genererte forslag og sett score på KI-eignetheit.</p>
            </div>

            {/* vc_step tab navigation */}
            <div className="flex gap-2 flex-wrap">
              {vcGroups.map(({ vs, tabScore }) => {
                const active = vs.id === activeVcId
                const vsIncluded = processes.some(p => p.vc_step_id === vs.id && (step2Included[p.id] ?? false))
                return (
                  <button
                    key={vs.id}
                    onClick={() => { if (!vsIncluded) return; setActiveVcId(vs.id); setOpenId(null) }}
                    disabled={!vsIncluded}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      !vsIncluded
                        ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        : active
                        ? 'bg-[#059669] text-white border-[#059669]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {vs.name}{' '}
                    <span className={`font-normal text-xs ${active ? 'opacity-70' : 'opacity-60'}`}>
                      ({tabScore})
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Accordion list — scoped to active vc_step */}
            <div className="flex flex-col gap-2">
            {activeProcs.map(process => {
              const isOpen = openId === process.id
              const isAiLoading = aiLoading[process.id] ?? false
              const isSaving = saving[process.id] ?? false
              const showRegenerate = problemChanged[process.id] ?? false
              const entry = entries[process.id] ?? {
                problem_desc: '', usecase_desc: '', business_goal: '', key_results: '', responsible: '', bxt_scores: {},
              }
              const tab = activeTab[process.id] ?? 'problem'
              const agg = bxtAgg(entry.bxt_scores)
              const col = getScoreColor(agg.total)
              const isFromStep2 = step2Included[process.id] ?? false

              return (
                <div
                  key={process.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: isOpen ? '2px solid #1E293B' : '2px solid #E2E8F0', opacity: isFromStep2 ? 1 : 0.4 }}
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => handleOpen(process)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors${!isFromStep2 ? ' cursor-not-allowed' : ''}`}
                    style={{ background: isOpen ? '#1E293B' : '#FAFBFC', color: isOpen ? '#F8FAFC' : '#1E293B' }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: isOpen ? '#F8FAFC' : col.dot }}
                      />
                      <span className="text-sm font-bold truncate">{process.name}</span>
                      {isAiLoading && (
                        <span className="text-xs font-normal italic opacity-70 shrink-0">✦ Genererer KI-forslag...</span>
                      )}
                      {isSaving && !isAiLoading && (
                        <span className="text-xs font-normal italic opacity-70 shrink-0">Lagrar...</span>
                      )}
                      {saveError[process.id] && !isSaving && !isAiLoading && (
                        <span className="text-xs font-normal shrink-0" style={{ color: isOpen ? '#FCA5A5' : '#EF4444' }}>Feil ved lagring</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-xs ml-3 shrink-0">
                      <span style={{ opacity: 0.65 }}>S:{agg.sA} G:{agg.fA}</span>
                      <span
                        className="px-2 py-0.5 rounded font-bold"
                        style={{ background: isOpen ? 'rgba(255,255,255,0.15)' : '#F1F5F9' }}
                      >
                        {agg.total}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ background: isOpen ? 'rgba(255,255,255,0.15)' : '#E2E8F0', color: isOpen ? '#F8FAFC' : '#64748B' }}
                      >
                        {isOpen ? 'Lukk ▲' : 'Åpne ▼'}
                      </span>
                    </span>
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="bg-white">
                      {isAiLoading && (
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                          <svg className="animate-spin h-4 w-4 text-[#10B981] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <p className="text-sm font-medium text-[#10B981]">Genererer KI-forslag...</p>
                        </div>
                      )}

                      {/* Tab nav */}
                      <div className="flex border-b border-slate-100 px-5">
                        {(['problem', 'bxt'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setActiveTab(prev => ({ ...prev, [process.id]: t }))}
                            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                              tab === t
                                ? 'border-[#10B981] text-[#10B981]'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {t === 'problem' ? 'Tekstanalyse' : 'Vurder KI-eignetheit'}
                          </button>
                        ))}
                      </div>

                      <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
                        {tab === 'problem' ? (
                          <div className="flex flex-col gap-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#1E293B] pb-2 border-b border-[#1E293B22]">
                              Problemstilling, KI-idé og mål
                            </p>
                            <div className="grid gap-x-3 gap-y-2 items-start" style={{ gridTemplateColumns: '175px 1fr' }}>
                              {(
                                [
                                  { field: 'problem_desc' as const, label: 'Problem som skal løses', placeholder: isAiLoading ? 'Genererer...' : 'Kva er utfordringa?', rows: 2 },
                                  { field: 'usecase_desc' as const, label: 'KI-brukstilfelle', placeholder: isAiLoading ? 'Genererer KI-idéar...' : 'Idé for KI-løysing', rows: 3 },
                                  { field: 'business_goal' as const, label: 'Forretningsmål', placeholder: 'Beskriv forretningsmålet', rows: 1 },
                                  { field: 'key_results' as const, label: 'Nøkkelresultat', placeholder: '3–5 målbare nøkkelresultat', rows: 1 },
                                  { field: 'responsible' as const, label: 'Ansvarleg', placeholder: 'Rolle, namn, avdeling', rows: 1 },
                                ] as { field: keyof Omit<BxtEntry, 'bxt_scores'>; label: string; placeholder: string; rows: number }[]
                              ).map(({ field, label, placeholder, rows }) => (
                                <>
                                  <span key={`${field}-label`} className="text-sm text-slate-600 font-semibold pt-1.5">{label}</span>
                                  <textarea
                                    key={`${field}-input`}
                                    rows={rows}
                                    placeholder={placeholder}
                                    value={entry[field]}
                                    onChange={e => setTextField(process.id, field, e.target.value)}
                                    onBlur={() => handleAutoSave(process.id)}
                                    onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }}
                                    className="px-2.5 py-1.5 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none leading-relaxed w-full overflow-hidden"
                                    style={{ background: isAiLoading && (field === 'problem_desc' || field === 'usecase_desc') ? '#F0F4FF' : '#FAFBFC' }}
                                  />
                                </>
                              ))}
                            </div>
                            {showRegenerate && (
                              <Button
                                onClick={() => handleRegenerateAI(process)}
                                disabled={isAiLoading}
                                className="self-start bg-[#1E293B] hover:bg-slate-700 text-white disabled:opacity-50"
                              >
                                {isAiLoading ? 'Genererer...' : 'Regenerer KI-forslag'}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-5">
                            {BXT_CATS.map(cat => (
                              <div key={cat.key}>
                                <p
                                  className="text-xs font-bold uppercase tracking-wider pb-2 mb-3 border-b"
                                  style={{ color: cat.color, borderColor: cat.color + '22' }}
                                >
                                  {cat.label}
                                </p>
                                <div className="grid gap-x-2.5 gap-y-1.5 items-center" style={{ gridTemplateColumns: '175px 1fr 58px' }}>
                                  {cat.items.map(item => (
                                    <>
                                      <span key={`${item.key}-label`} className="text-xs text-slate-600" title={item.tip}>{item.label}</span>
                                      <input
                                        key={`${item.key}-comment`}
                                        type="text"
                                        placeholder="Kommentar..."
                                        value={String(entry.bxt_scores[`${item.key}_comment`] ?? '')}
                                        onChange={e => setComment(process.id, item.key, e.target.value)}
                                        onBlur={() => handleAutoSave(process.id)}
                                        className="px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-slate-50 w-full"
                                      />
                                      <select
                                        key={`${item.key}-score`}
                                        value={Number(entry.bxt_scores[item.key] ?? 3)}
                                        onChange={e => setScore(process.id, item.key, Number(e.target.value))}
                                        onBlur={() => handleAutoSave(process.id)}
                                        className="w-full py-1.5 border border-slate-200 rounded text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-white cursor-pointer"
                                      >
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                      </select>
                                    </>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          </div>

          {/* Del B — KI-eignetheit */}
          {processes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 mt-8">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">B</span>
                  <div>
                    <h3 className="text-base font-bold text-[#1E293B]">KI-eignetheit (indikasjon)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Diagrammet nedanfor viser alle prosessar fordelt etter forretningseffekt og gjennomførbarheit.</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <button
                    onClick={() => setPlotFilter(null)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                      plotFilter === null
                        ? 'bg-[#1E293B] text-white border-[#1E293B]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    Alle
                  </button>
                  {legendItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setPlotFilter(plotFilter === item.id ? null : item.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                        plotFilter === item.id
                          ? 'text-white border-transparent'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                      style={plotFilter === item.id ? { backgroundColor: item.color, borderColor: item.color } : {}}
                    >
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
              <ScatterPlot processes={filteredPlotProcesses} showLabels={plotFilter !== null} />
            </div>
          )}

          {/* Del C — Prosessar vidare */}
          {processes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 mt-8">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">C</span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Prosessar vidare til oppgåveanalyse</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Prosessar med KI-eignetheit ≥ 4 vert anbefalt vidare. Klikk for å endre.</p>
                </div>
              </div>
              {vcSteps.map(vs => {
                const vsProcs = processes.filter(p => p.vc_step_id === vs.id)
                if (!vsProcs.length) return null
                return (
                  <div key={vs.id} className="flex flex-col gap-2">
                    <div className="text-center text-sm font-bold text-[#1E293B] py-1 border-b border-slate-200">
                      {vs.name}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                      {vsProcs.map(p => {
                        const agg = bxtAgg((entries[p.id]?.bxt_scores ?? {}) as Record<string, number | string>)
                        const autoIncl = agg.total >= 4
                        const state = p.included ? (autoIncl ? 'auto' : 'manual') : 'excluded'
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
                            key={p.id}
                            onClick={() => handleToggleIncluded(p.id)}
                            className="cursor-pointer rounded-lg p-2 text-center transition-all"
                            style={{ background: boxStyle.bg, border: boxStyle.border, opacity: p.included ? 1 : 0.6 }}
                          >
                            <div className="text-[11px] font-bold leading-snug text-[#1E293B]">{trunc(p.name)}</div>
                            <div className="text-xs mt-1 text-slate-600">{agg.total}</div>
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
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={() => { router.refresh(); router.push(`/analyse/${analyseId}/steg/2`) }}
          disabled={isLoadingFromDB}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50"
        >
          ← Førre steg
        </Button>
        <Button
          onClick={() => { router.refresh(); router.push(`/analyse/${analyseId}/steg/4`) }}
          className="bg-[#10B981] hover:bg-[#059669] text-white"
        >
          Neste steg →
        </Button>
      </div>
    </div>
  )
}
