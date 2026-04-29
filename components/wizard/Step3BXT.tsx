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

function bxtAgg(bxt: Record<string, number | string>) {
  const avg = (keys: string[]) => {
    const scored = keys.map(k => Number(bxt[k] ?? 0)).filter(v => v > 0)
    return scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0
  }
  const sA = avg(S_KEYS)
  const fA = avg(F_KEYS)
  const total = sA > 0 && fA > 0 ? (sA + fA) / 2 : 0
  return {
    sA: Math.round(sA * 10) / 10,
    fA: Math.round(fA * 10) / 10,
    total: Math.round(total * 10) / 10,
  }
}

function scoreColor(v: number) {
  if (!v) return '#94A3B8'
  if (v >= 4) return '#10B981'
  if (v >= 2.5) return '#F59E0B'
  return '#EF4444'
}

type PlotProcess = Process & { sA: number; fA: number; total: number }

function ScatterPlot({ processes }: { processes: PlotProcess[] }) {
  const W = 420
  const H = 300
  const ml = 52
  const mt = 24
  const mr = 20
  const mb = 48
  const pw = W - ml - mr
  const ph = H - mt - mb

  const xPos = (fA: number) => ml + ((fA - 1) / 4) * pw
  const yPos = (sA: number) => mt + ((5 - sA) / 4) * ph

  const xMid = ml + pw / 2
  const yMid = mt + ph / 2

  const quadrants = [
    { x: xMid + 6, y: mt + 14, label: 'Utfør oppgåveanalyse', color: '#3B82F6', bg: '#DBEAFE33' },
    { x: ml + 6, y: mt + 14, label: 'Utforsk vidare', color: '#D97706', bg: '#FEF9C333' },
    { x: xMid + 6, y: yMid + 16, label: 'Inkuber', color: '#10B981', bg: '#D1FAE533' },
    { x: ml + 6, y: yMid + 16, label: 'Sett på vent', color: '#EF4444', bg: '#FEE2E233' },
  ]

  const plotted = processes.filter(p => p.sA > 0 && p.fA > 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto">
      {/* Quadrant backgrounds */}
      <rect x={ml} y={mt} width={pw / 2} height={ph / 2} fill="#FEF9C3" opacity="0.35" />
      <rect x={xMid} y={mt} width={pw / 2} height={ph / 2} fill="#DBEAFE" opacity="0.35" />
      <rect x={ml} y={yMid} width={pw / 2} height={ph / 2} fill="#FEE2E2" opacity="0.35" />
      <rect x={xMid} y={yMid} width={pw / 2} height={ph / 2} fill="#D1FAE5" opacity="0.35" />

      {/* Plot border */}
      <rect x={ml} y={mt} width={pw} height={ph} fill="none" stroke="#CBD5E1" strokeWidth="1" />

      {/* Midlines */}
      <line x1={ml} y1={yMid} x2={ml + pw} y2={yMid} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" />
      <line x1={xMid} y1={mt} x2={xMid} y2={mt + ph} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" />

      {/* Quadrant labels */}
      {quadrants.map((q, i) => (
        <text key={i} x={q.x} y={q.y} fontSize="9" fill={q.color} fontWeight="700" opacity="0.85">{q.label}</text>
      ))}

      {/* Axis ticks */}
      {[1, 2, 3, 4, 5].map(v => (
        <g key={v}>
          <text x={xPos(v)} y={mt + ph + 14} fontSize="9" fill="#94A3B8" textAnchor="middle">{v}</text>
          <text x={ml - 7} y={yPos(v) + 4} fontSize="9" fill="#94A3B8" textAnchor="end">{v}</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={ml + pw / 2} y={H - 6} fontSize="10" fill="#64748B" textAnchor="middle" fontWeight="500">
        Gjennomførbarhet (G)
      </text>
      <text
        x={14}
        y={mt + ph / 2}
        fontSize="10"
        fill="#64748B"
        textAnchor="middle"
        fontWeight="500"
        transform={`rotate(-90, 14, ${mt + ph / 2})`}
      >
        Forretningseffekt (S)
      </text>

      {/* Process dots */}
      {plotted.map(p => {
        const cx = xPos(p.fA)
        const cy = yPos(p.sA)
        const fill = p.total >= 4 ? '#10B981' : p.total >= 2.5 ? '#F59E0B' : '#EF4444'
        return (
          <g key={p.id}>
            <circle cx={cx} cy={cy} r={9} fill={fill} opacity="0.85" />
            <circle cx={cx} cy={cy} r={9} fill="none" stroke="white" strokeWidth="1.5" />
            <title>{p.name} (S: {p.sA}, G: {p.fA}, Total: {p.total})</title>
          </g>
        )
      })}

      {/* Empty state */}
      {plotted.length === 0 && (
        <text x={ml + pw / 2} y={mt + ph / 2} fontSize="11" fill="#CBD5E1" textAnchor="middle">
          Fyll ut BXT-scoring for å sjå prosessane her
        </text>
      )}
    </svg>
  )
}

export function Step3BXT({ analyseId, analysisTitle, vcSteps }: Props) {
  const router = useRouter()
  const vcStepNames = Object.fromEntries(vcSteps.map(vs => [vs.id, vs.name]))

  const [processes, setProcesses] = useState<Process[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, 'problem' | 'bxt'>>({})
  const [entries, setEntries] = useState<Record<string, BxtEntry>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)

  useEffect(() => {
    Promise.all(vcSteps.map(vs => getProcessesForVcStepAction(vs.id))).then(results => {
      const included: Process[] = []
      for (const r of results) {
        if (r.success && r.data) included.push(...r.data.filter(p => p.included))
      }
      setProcesses(included)
      const initEntries: Record<string, BxtEntry> = {}
      for (const p of included) {
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
      setIsLoadingFromDB(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleOpen(process: Process) {
    if (openId === process.id) { setOpenId(null); return }
    setOpenId(process.id)
    setActiveTab(prev => ({ ...prev, [process.id]: prev[process.id] ?? 'problem' }))

    const entry = entries[process.id]
    if (entry?.problem_desc || entry?.usecase_desc || process.ai_suggestion) return

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
          problem_desc: '', usecase_desc: '', business_goal: '', key_results: '', responsible: '', bxt_scores: {}
        }
        const updatedEntry: BxtEntry = { ...currentEntry, problem_desc: json.problem, usecase_desc: json.ideas }
        setEntries(prev => ({ ...prev, [process.id]: updatedEntry }))
        setProcesses(prev => prev.map(p =>
          p.id === process.id ? { ...p, problem_desc: json.problem as string, usecase_desc: json.ideas as string, ai_suggestion: cached } : p
        ))
        await saveBxtDataAction(process.id, { ...updatedEntry, ai_suggestion: cached })
      }
    } catch {
      // AI error non-critical
    } finally {
      setAiLoading(prev => ({ ...prev, [process.id]: false }))
    }
  }

  async function handleSave(processId: string) {
    setSaveError(null)
    setSaving(prev => ({ ...prev, [processId]: true }))
    const entry = entries[processId]
    const aiSuggestion = processes.find(p => p.id === processId)?.ai_suggestion ?? null
    const result = await saveBxtDataAction(processId, { ...entry, ai_suggestion: aiSuggestion })
    if (!result.success) setSaveError(result.error ?? 'Kunne ikkje lagre')
    setSaving(prev => ({ ...prev, [processId]: false }))
  }

  async function handleToggleIncluded(processId: string) {
    const process = processes.find(p => p.id === processId)
    if (!process) return
    const newIncluded = !process.included
    setProcesses(prev => prev.map(p => p.id === processId ? { ...p, included: newIncluded } : p))
    await saveProcessIncludedAction(processId, newIncluded)
  }

  function setScore(processId: string, key: string, value: number) {
    setEntries(prev => ({
      ...prev,
      [processId]: {
        ...prev[processId],
        bxt_scores: { ...prev[processId].bxt_scores, [key]: value },
      },
    }))
  }

  function setComment(processId: string, key: string, value: string) {
    setEntries(prev => ({
      ...prev,
      [processId]: {
        ...prev[processId],
        bxt_scores: { ...prev[processId].bxt_scores, [`${key}_comment`]: value },
      },
    }))
  }

  function setTextField(processId: string, field: keyof Omit<BxtEntry, 'bxt_scores'>, value: string) {
    setEntries(prev => ({
      ...prev,
      [processId]: { ...prev[processId], [field]: value },
    }))
  }

  const plotProcesses: PlotProcess[] = processes.map(p => ({
    ...p,
    ...bxtAgg((entries[p.id]?.bxt_scores ?? {}) as Record<string, number | string>),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-2">
        <h2 className="text-base font-semibold text-[#1E293B]">BXT-analyse per prosess</h2>
        <p className="text-sm text-slate-500">
          Opne kvar prosess for å fylle ut problemanalyse og BXT-scoring. KI genererer startpunkt for tekstfelta automatisk.
        </p>
      </div>

      {/* Process list */}
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
        <div className="flex flex-col gap-2">
          {processes.map(process => {
            const isOpen = openId === process.id
            const isAiLoading = aiLoading[process.id] ?? false
            const isSaving = saving[process.id] ?? false
            const entry = entries[process.id] ?? {
              problem_desc: '', usecase_desc: '', business_goal: '', key_results: '', responsible: '', bxt_scores: {}
            }
            const tab = activeTab[process.id] ?? 'problem'
            const { sA, fA, total } = bxtAgg(entry.bxt_scores)
            const hasText = !!(entry.problem_desc || entry.usecase_desc)

            return (
              <div key={process.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => handleOpen(process)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1E293B] truncate">{process.name}</p>
                      <p className="text-xs text-slate-400">{vcStepNames[process.vc_step_id ?? ''] ?? ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAiLoading && (
                        <span className="text-xs text-[#10B981] animate-pulse font-medium">Genererer...</span>
                      )}
                      {total > 0 && (
                        <>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">S: {sA}</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">G: {fA}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: scoreColor(total) }}
                          >
                            {total}
                          </span>
                        </>
                      )}
                      {hasText && !isAiLoading && total === 0 && (
                        <span className="text-xs text-emerald-600 font-medium">✓</span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm ml-4 shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {isAiLoading && (
                      <div className="flex items-center gap-2 px-5 py-4">
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
                          {t === 'problem' ? 'Tekstanalyse' : 'BXT-scoring'}
                        </button>
                      ))}
                    </div>

                    <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
                      {tab === 'problem' ? (
                        <>
                          {(
                            [
                              {
                                field: 'problem_desc' as const,
                                label: 'Problembeskrivelse',
                                help: 'Kva problem eller ineffektivitet i denne prosessen kan KI adressere?',
                                placeholder: 'Beskriv problemet...',
                                rows: 3,
                              },
                              {
                                field: 'usecase_desc' as const,
                                label: 'KI-bruksområde',
                                help: 'Konkrete idear for korleis KI eller automatisering kan brukast her.',
                                placeholder: 'Beskriv bruksområde...',
                                rows: 3,
                              },
                              {
                                field: 'business_goal' as const,
                                label: 'Forretningsmål',
                                help: 'Kva forretningsmål støttar dette initiativet?',
                                placeholder: 'Beskriv forretningsmålet...',
                                rows: 2,
                              },
                              {
                                field: 'key_results' as const,
                                label: 'Nøkkelresultat',
                                help: 'Kva målbare resultat forventar du?',
                                placeholder: 'Beskriv nøkkelresultat...',
                                rows: 2,
                              },
                              {
                                field: 'responsible' as const,
                                label: 'Ansvarleg',
                                help: 'Kven er ansvarleg for dette initiativet?',
                                placeholder: 'Namn eller rolle...',
                                rows: 1,
                              },
                            ] as { field: keyof Omit<BxtEntry, 'bxt_scores'>; label: string; help: string; placeholder: string; rows: number }[]
                          ).map(({ field, label, help, placeholder, rows }) => (
                            <div key={field} className="flex flex-col gap-1">
                              <label className="text-sm font-medium text-[#1E293B]">{label}</label>
                              <p className="text-xs text-slate-400">{help}</p>
                              <textarea
                                value={entry[field]}
                                onChange={e => setTextField(process.id, field, e.target.value)}
                                rows={rows}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                                placeholder={placeholder}
                              />
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-col gap-6">
                          {BXT_CATS.map(cat => (
                            <div key={cat.key} className="flex flex-col gap-3">
                              <h4
                                className="text-xs font-bold uppercase tracking-wider"
                                style={{ color: cat.color }}
                              >
                                {cat.label}
                              </h4>
                              {cat.items.map(item => (
                                <div
                                  key={item.key}
                                  className="flex flex-col gap-2 pl-3 border-l-2"
                                  style={{ borderColor: cat.color + '44' }}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <p
                                      className="text-sm font-medium text-[#1E293B] mt-1"
                                      title={item.tip}
                                    >
                                      {item.label}
                                    </p>
                                    <div className="flex gap-1 shrink-0">
                                      {[1, 2, 3, 4, 5].map(n => (
                                        <button
                                          key={n}
                                          type="button"
                                          onClick={() => setScore(process.id, item.key, n)}
                                          className={`w-8 h-8 rounded text-xs font-semibold transition-colors ${
                                            Number(entry.bxt_scores[item.key] ?? 0) === n
                                              ? 'bg-[#1E293B] text-white'
                                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                          }`}
                                        >
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <textarea
                                    value={String(entry.bxt_scores[`${item.key}_comment`] ?? '')}
                                    onChange={e => setComment(process.id, item.key, e.target.value)}
                                    rows={2}
                                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none text-slate-600 placeholder-slate-300"
                                    placeholder="Kommentar (valfri)..."
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {saveError && openId === process.id && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          {saveError}
                        </p>
                      )}

                      <Button
                        onClick={() => handleSave(process.id)}
                        disabled={isSaving}
                        className="self-start bg-[#1E293B] hover:bg-slate-700 text-white disabled:opacity-50"
                      >
                        {isSaving ? 'Lagrar...' : 'Lagre'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Scatter plot */}
      {!isLoadingFromDB && processes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1E293B]">Prioriteringsmatrise</h3>
            <p className="text-xs text-slate-400 mt-1">
              Forretningseffekt (S) mot gjennomførbarhet (G). Fyll ut BXT-scoring for å plotte prosessane.
            </p>
          </div>
          <ScatterPlot processes={plotProcesses} />
        </div>
      )}

      {/* Summary grid */}
      {!isLoadingFromDB && processes.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1E293B]">Oppsummering</h3>
            <p className="text-xs text-slate-400 mt-1">
              Klikk på ein prosess for å inkludere eller ekskludere han frå steg 4.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {processes.map(p => {
              const { sA, fA, total } = bxtAgg((entries[p.id]?.bxt_scores ?? {}) as Record<string, number | string>)
              const color = scoreColor(total)
              return (
                <button
                  key={p.id}
                  onClick={() => handleToggleIncluded(p.id)}
                  className={`rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm ${
                    p.included
                      ? total >= 4
                        ? 'border-[#10B981] bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-200 opacity-50 hover:opacity-70 bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#1E293B] line-clamp-2 mb-2">{p.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      S: {sA || '–'}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      G: {fA || '–'}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                      style={{ backgroundColor: color }}
                    >
                      {total || '–'}
                    </span>
                  </div>
                  {!p.included && (
                    <p className="text-xs text-slate-400 mt-1.5">Ekskludert</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
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
