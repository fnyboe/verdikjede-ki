'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getProcessesForVcStepAction,
  getTasksByProcessAction,
  saveTasksAction,
  deleteTaskAction,
  updateTaskAction,
} from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import type { VcStep, Process, Task } from '@/types'

interface Props {
  analyseId: string
  analysisTitle: string
  vcSteps: VcStep[]
}

type TaskInput = {
  name: string
  automation: number
  automation_reason: string
  improvement: number
  improvement_reason: string
  tech: string
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 shrink-0 ${className ?? 'text-[#10B981]'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function scoreStyle(a: number, i: number) {
  const s = a * i
  if (s >= 16) return { bg: '#D1FAE5', text: '#065F46', s }
  if (s >= 9)  return { bg: '#FEF3C7', text: '#92400E', s }
  return { bg: '#FEE2E2', text: '#991B1B', s }
}

function ScoreSelect({
  label, tip, value,
  onChange, onBlur,
}: {
  label: string
  tip: string
  value: number
  onChange: (v: number) => void
  onBlur: () => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative shrink-0">
      <span
        className="text-[10px] text-slate-500 block text-center leading-none mb-0.5 cursor-help select-none"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className="w-12 py-1 border border-slate-200 rounded text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-white cursor-pointer"
      >
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none" style={{ width: '200px' }}>
          <div className="bg-white rounded-lg p-2 border border-slate-200 shadow-md text-xs text-slate-600 text-left whitespace-pre-line">
            {tip}
          </div>
        </div>
      )}
    </div>
  )
}

function ThTooltip({ label, tip }: { label: string; tip: string }) {
  const [show, setShow] = useState(false)
  const lines = tip.split(', ').filter(l => l.trim().length > 0)
  return (
    <span
      className="relative cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {label}
      {show && (
        <span className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none" style={{ width: '280px' }}>
          <span className="block bg-white rounded-lg p-3 text-left border border-slate-200 shadow-md">
            <span className="block text-xs font-bold text-[#1E293B] mb-2">{label}:</span>
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

function InfoTooltip({ automationReason, improvementReason }: { automationReason: string; improvementReason: string }) {
  const [show, setShow] = useState(false)
  if (!automationReason && !improvementReason) return null
  return (
    <span
      className="relative inline-block align-middle ml-1 shrink-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-slate-400 hover:text-slate-600 cursor-help text-[11px] select-none">ℹ</span>
      {show && (
        <span className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none" style={{ width: '320px' }}>
          <span className="block bg-white rounded-lg p-3 border border-slate-200 shadow-md text-xs text-left leading-snug">
            {automationReason && (
              <span className="block mb-2">
                <span className="font-semibold text-slate-700 block mb-0.5">Automatisering</span>
                <span className="text-slate-500">{automationReason}</span>
              </span>
            )}
            {improvementReason && (
              <span className="block">
                <span className="font-semibold text-slate-700 block mb-0.5">Forbedring</span>
                <span className="text-slate-500">{improvementReason}</span>
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  )
}

export function Step4Oppgaver({ analyseId, analysisTitle, vcSteps }: Props) {
  const router = useRouter()
  const vcStepNames = Object.fromEntries(vcSteps.map(vs => [vs.id, vs.name]))

  const [processes, setProcesses] = useState<Process[]>([])
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [activeVcId, setActiveVcId] = useState<string | null>(null)
  const [step3Included, setStep3Included] = useState<Record<string, boolean>>({})
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [savingTask, setSavingTask] = useState<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all(vcSteps.map(vs => getProcessesForVcStepAction(vs.id))).then(async results => {
      const allProcs: Process[] = []
      const s3inc: Record<string, boolean> = {}
      for (const r of results) {
        if (r.success && r.data) {
          allProcs.push(...r.data.map(p => {
            s3inc[p.id] = p.included
            return { ...p }
          }))
        }
      }
      setProcesses(allProcs)
      setStep3Included(s3inc)

      const taskResults = await Promise.all(allProcs.map(p => getTasksByProcessAction(p.id)))
      const taskMap: Record<string, Task[]> = {}
      for (let i = 0; i < allProcs.length; i++) {
        const r = taskResults[i]
        taskMap[allProcs[i].id] = r.success && r.data ? r.data : []
      }
      setTasks(taskMap)

      const firstVc =
        vcSteps.find(vs => allProcs.some(p => p.vc_step_id === vs.id && s3inc[p.id])) ??
        vcSteps.find(vs => allProcs.some(p => p.vc_step_id === vs.id))
      if (firstVc) setActiveVcId(firstVc.id)

      setIsLoadingFromDB(false)

      const needsTasks = allProcs.filter(p => (s3inc[p.id] ?? false) && (taskMap[p.id] ?? []).length === 0)
      if (needsTasks.length > 0) {
        await generateTasks(needsTasks)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateTasksForProcess(p: Process): Promise<Task[] | null> {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'steg4',
          processName: p.name,
          vcStepName: vcStepNames[p.vc_step_id ?? ''] ?? '',
          analysisTitle,
          processProblem: p.problem_desc ?? '',
          processUsecase: p.usecase_desc ?? '',
        }),
      })
      const json = await res.json() as Record<string, unknown>
      if (!res.ok || !Array.isArray(json.tasks)) {
        console.error('[steg4] AI-svar ugyldig for', p.name, json)
        return null
      }
      const aiTasks = json.tasks as TaskInput[]
      const result = await saveTasksAction(p.id, aiTasks)
      if (!result.success || !result.data) {
        console.error('[steg4] saveTasksAction feila for', p.name, result.error)
        return null
      }
      return result.data
    } catch (err) {
      console.error('[steg4] Uhandtert feil for', p.name, err)
      return null
    }
  }

  async function generateTasks(toGenerate: Process[]) {
    setAiGenerating(true)
    for (const p of toGenerate) {
      const saved = await generateTasksForProcess(p)
      if (saved) {
        setTasks(prev => ({ ...prev, [p.id]: saved }))
      }
    }
    setAiGenerating(false)
  }

  async function handleRegenerateAll() {
    if (aiGenerating || processes.length === 0) return
    await generateTasks(processes.filter(p => step3Included[p.id] ?? false))
  }

  function handleUpdateTaskLocal(
    taskId: string,
    processId: string,
    field: keyof Pick<Task, 'name' | 'automation' | 'automation_reason' | 'improvement' | 'improvement_reason' | 'tech'>,
    value: string | number
  ) {
    setTasks(prev => ({
      ...prev,
      [processId]: (prev[processId] ?? []).map(t => t.id === taskId ? { ...t, [field]: value } : t),
    }))
  }

  async function handleSaveTask(taskId: string, processId: string) {
    const task = tasks[processId]?.find(t => t.id === taskId)
    if (!task) return
    setSavingTask(prev => ({ ...prev, [taskId]: true }))
    await updateTaskAction(taskId, {
      name: task.name,
      automation: task.automation,
      automation_reason: task.automation_reason,
      improvement: task.improvement,
      improvement_reason: task.improvement_reason,
      tech: task.tech,
    })
    setSavingTask(prev => ({ ...prev, [taskId]: false }))
  }

  async function handleDeleteTask(taskId: string, processId: string) {
    await deleteTaskAction(taskId)
    setTasks(prev => ({
      ...prev,
      [processId]: (prev[processId] ?? []).filter(t => t.id !== taskId),
    }))
  }

  const vcGroups = vcSteps
    .map(vs => {
      const procs = processes.filter(p => p.vc_step_id === vs.id)
      if (!procs.length) return null
      return { vs, procs }
    })
    .filter((g): g is { vs: VcStep; procs: Process[] } => g !== null)

  const activeProcs = processes.filter(p => p.vc_step_id === activeVcId)
  const allTasks = processes.flatMap(p => tasks[p.id] ?? [])

  return (
    <div className="flex flex-col gap-6">
      {aiGenerating && (
        <div className="bg-white rounded-xl border border-[#10B981] p-4 flex items-center gap-3">
          <Spinner />
          <p className="text-sm font-medium text-[#10B981]">Genererer oppgåveforslag...</p>
        </div>
      )}

      {isLoadingFromDB ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center gap-2">
          <Spinner />
          <p className="text-sm font-medium text-[#10B981]">Lastar prosessar...</p>
        </div>
      ) : processes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Ingen inkluderte prosessar funne. Gå tilbake til steg 3 og merk prosessar som inkludert.
        </div>
      ) : (
        <>
          {/* Del A – Oppgåver per prosess */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">A</span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Oppgåver per prosess</h3>
                  <p className="text-xs text-slate-500 mt-0.5">KI-genererte oppgåveforslag. Rediger eller slett etter behov.</p>
                </div>
              </div>
              <Button
                onClick={handleRegenerateAll}
                disabled={aiGenerating}
                className="bg-[#1E293B] hover:bg-slate-700 text-white text-xs disabled:opacity-50 shrink-0"
              >
                {aiGenerating ? 'Genererer...' : 'Regenerer alle'}
              </Button>
            </div>

            {/* Tab-navigasjon */}
            <div className="flex gap-2 flex-wrap">
              {vcGroups.map(({ vs }) => {
                const active = vs.id === activeVcId
                return (
                  <button
                    key={vs.id}
                    onClick={() => { setActiveVcId(vs.id); setOpenId(null) }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      active
                        ? 'bg-[#059669] text-white border-[#059669]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {vs.name}
                  </button>
                )
              })}
            </div>

            {/* Accordion-liste */}
            <div className="flex flex-col gap-2">
              {activeProcs.map(process => {
                const isOpen = openId === process.id
                const isFromStep3 = step3Included[process.id] ?? false
                const processTasks = tasks[process.id] ?? []

                return (
                  <div
                    key={process.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: isOpen ? '2px solid #1E293B' : '2px solid #E2E8F0', opacity: isFromStep3 ? 1 : 0.4 }}
                  >
                    {/* Accordion-header */}
                    <button
                      onClick={() => { if (!isFromStep3) return; setOpenId(isOpen ? null : process.id) }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors${!isFromStep3 ? ' cursor-not-allowed' : ''}`}
                      style={{ background: isOpen ? '#1E293B' : '#FAFBFC', color: isOpen ? '#F8FAFC' : '#1E293B' }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold truncate">{process.name}</span>
                        {aiGenerating && processTasks.length === 0 && (
                          <span className="text-xs font-normal italic opacity-70 shrink-0">✦ Genererer...</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 text-xs ml-3 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded font-bold"
                          style={{ background: isOpen ? 'rgba(255,255,255,0.15)' : '#F1F5F9' }}
                        >
                          {processTasks.length} oppgåver
                        </span>
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{
                            background: isOpen ? 'rgba(255,255,255,0.15)' : '#E2E8F0',
                            color: isOpen ? '#F8FAFC' : '#64748B',
                          }}
                        >
                          {isOpen ? 'Lukk ▲' : 'Åpne ▼'}
                        </span>
                      </span>
                    </button>

                    {/* Accordion-body */}
                    {isOpen && (
                      <div className="bg-white px-4 py-3 flex flex-col gap-2">
                        {processTasks.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">
                            {aiGenerating ? 'Genererer oppgåver...' : 'Ingen oppgåver enno.'}
                          </p>
                        ) : (
                          processTasks.map(task => {
                            const isExpanded = expandedTaskId === task.id
                            const sc = scoreStyle(task.automation, task.improvement)
                            return (
                              <div
                                key={task.id}
                                className="rounded-lg border border-slate-200 overflow-hidden"
                                style={{ background: isExpanded ? '#fff' : '#FAFBFC' }}
                              >
                                {/* Nivå 1 – alltid synleg */}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <input
                                    type="text"
                                    value={task.name}
                                    onChange={e => handleUpdateTaskLocal(task.id, process.id, 'name', e.target.value)}
                                    onBlur={() => handleSaveTask(task.id, process.id)}
                                    className="flex-1 min-w-0 text-sm font-semibold text-[#1E293B] bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                                  />
                                  <ScoreSelect
                                    label="Auto"
                                    tip={'Automatiseringsgrad\n1 = minimalt kan automatiserast\n5 = fullt automatiserbart'}
                                    value={task.automation}
                                    onChange={v => handleUpdateTaskLocal(task.id, process.id, 'automation', v)}
                                    onBlur={() => handleSaveTask(task.id, process.id)}
                                  />
                                  <ScoreSelect
                                    label="Forb."
                                    tip={'Forbetringspotensial\n1 = liten forbetring\n5 = svært stor forbetring'}
                                    value={task.improvement}
                                    onChange={v => handleUpdateTaskLocal(task.id, process.id, 'improvement', v)}
                                    onBlur={() => handleSaveTask(task.id, process.id)}
                                  />
                                  <span
                                    className="shrink-0 w-8 text-center py-1 rounded text-xs font-bold"
                                    style={{ background: sc.bg, color: sc.text }}
                                  >
                                    {sc.s}
                                  </span>
                                  <button
                                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    className="shrink-0 text-slate-400 hover:text-[#1E293B] transition-colors text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200"
                                    title={isExpanded ? 'Skjul detaljar' : 'Vis detaljar'}
                                  >
                                    {isExpanded ? '▲' : '▼'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id, process.id)}
                                    className="shrink-0 text-slate-400 hover:text-red-500 transition-colors text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-red-50"
                                    title="Slett oppgåve"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Nivå 2 – utvida detaljar */}
                                {isExpanded && (
                                  <div className="bg-white border-t border-slate-100 px-3 py-3 flex flex-col gap-2">
                                    <div
                                      className="grid gap-x-3 gap-y-1.5 items-start"
                                      style={{ gridTemplateColumns: '140px 1fr' }}
                                    >
                                      <span className="text-xs text-slate-500 font-semibold pt-1.5">Automatisering – kvifor</span>
                                      <textarea
                                        rows={2}
                                        value={task.automation_reason}
                                        onChange={e => handleUpdateTaskLocal(task.id, process.id, 'automation_reason', e.target.value)}
                                        onBlur={() => handleSaveTask(task.id, process.id)}
                                        className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none bg-slate-50 w-full leading-relaxed"
                                      />
                                      <span className="text-xs text-slate-500 font-semibold pt-1.5">Forbetring – kvifor</span>
                                      <textarea
                                        rows={2}
                                        value={task.improvement_reason}
                                        onChange={e => handleUpdateTaskLocal(task.id, process.id, 'improvement_reason', e.target.value)}
                                        onBlur={() => handleSaveTask(task.id, process.id)}
                                        className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none bg-slate-50 w-full leading-relaxed"
                                      />
                                      <span className="text-xs text-slate-500 font-semibold pt-1.5">Teknologi</span>
                                      <input
                                        type="text"
                                        value={task.tech}
                                        onChange={e => handleUpdateTaskLocal(task.id, process.id, 'tech', e.target.value)}
                                        onBlur={() => handleSaveTask(task.id, process.id)}
                                        className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-slate-50 w-full"
                                      />
                                    </div>
                                    {savingTask[task.id] && (
                                      <span className="text-[10px] text-slate-400 self-end">Lagrar...</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Del B – Oppsummering */}
          {allTasks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">B</span>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Oppsummering</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alle oppgåver på tvers av prosessar ({allTasks.length} totalt)
                  </p>
                </div>
              </div>
              <div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600 w-[140px]">Prosess</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600">Oppgåve</th>
                      <th className="text-center py-2 pr-3 font-semibold text-slate-600 w-28">
                        <ThTooltip
                          label="Automatisering"
                          tip="Standardisering, grad av regelstyring, variasjon i input, behov for menneskelig involvering, datatilgang og kvalitet"
                        />
                      </th>
                      <th className="text-center py-2 pr-3 font-semibold text-slate-600 w-24">
                        <ThTooltip
                          label="Forbedring"
                          tip="Tidsbruk per utførelse, kostnad per utførelse, hyppighet/volum, feilrate/omarbeid, belastning på ansatte"
                        />
                      </th>
                      <th className="text-center py-2 pr-4 font-semibold text-slate-600 w-14">Score</th>
                      <th className="text-left py-2 font-semibold text-slate-600 hidden lg:table-cell">Teknologi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map(p => {
                      const ptasks = tasks[p.id] ?? []
                      return ptasks.map((task, ti) => {
                        const sc = scoreStyle(task.automation, task.improvement)
                        return (
                          <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-1.5 pr-4 align-middle">
                              {ti === 0 ? <span className="font-semibold text-[#1E293B]">{p.name}</span> : null}
                            </td>
                            <td className="py-1.5 pr-4 align-middle">
                              <span className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={task.name}
                                  onChange={e => handleUpdateTaskLocal(task.id, p.id, 'name', e.target.value)}
                                  onBlur={() => handleSaveTask(task.id, p.id)}
                                  className="flex-1 min-w-0 font-semibold text-[#1E293B] bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:bg-white"
                                />
                                <InfoTooltip
                                  automationReason={task.automation_reason}
                                  improvementReason={task.improvement_reason}
                                />
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 align-middle text-center">
                              <select
                                value={task.automation}
                                onChange={e => handleUpdateTaskLocal(task.id, p.id, 'automation', Number(e.target.value))}
                                onBlur={() => handleSaveTask(task.id, p.id)}
                                className="w-12 py-0.5 border border-slate-200 rounded text-xs text-center font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-white cursor-pointer text-slate-600"
                              >
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </td>
                            <td className="py-1.5 pr-3 align-middle text-center">
                              <select
                                value={task.improvement}
                                onChange={e => handleUpdateTaskLocal(task.id, p.id, 'improvement', Number(e.target.value))}
                                onBlur={() => handleSaveTask(task.id, p.id)}
                                className="w-12 py-0.5 border border-slate-200 rounded text-xs text-center font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-white cursor-pointer text-slate-600"
                              >
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </td>
                            <td className="py-1.5 pr-4 align-middle text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: sc.bg, color: sc.text }}>{sc.s}</span>
                            </td>
                            <td className="py-1.5 align-middle hidden lg:table-cell">
                              <input
                                type="text"
                                value={task.tech}
                                onChange={e => handleUpdateTaskLocal(task.id, p.id, 'tech', e.target.value)}
                                onBlur={() => handleSaveTask(task.id, p.id)}
                                className="w-full text-slate-500 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:bg-white"
                              />
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigasjon */}
      <div className="flex justify-between">
        <Button
          onClick={() => { router.refresh(); router.push(`/analyse/${analyseId}/steg/3`) }}
          disabled={isLoadingFromDB}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50"
        >
          ← Førre steg
        </Button>
        <Button
          onClick={() => { router.refresh(); router.push(`/analyse/${analyseId}/steg/5`) }}
          className="bg-[#10B981] hover:bg-[#059669] text-white"
        >
          Neste steg →
        </Button>
      </div>
    </div>
  )
}
