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

export function Step4Oppgaver({ analyseId, analysisTitle, vcSteps }: Props) {
  const router = useRouter()
  const vcStepNames = Object.fromEntries(vcSteps.map(vs => [vs.id, vs.name]))

  const [processes, setProcesses] = useState<Process[]>([])
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeVcId, setActiveVcId] = useState<string | null>(null)
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [savingTask, setSavingTask] = useState<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all(vcSteps.map(vs => getProcessesForVcStepAction(vs.id))).then(async results => {
      const allProcs: Process[] = []
      for (const r of results) {
        if (r.success && r.data) {
          allProcs.push(...r.data.filter(p => p.included))
        }
      }
      setProcesses(allProcs)

      const taskResults = await Promise.all(allProcs.map(p => getTasksByProcessAction(p.id)))
      const taskMap: Record<string, Task[]> = {}
      for (let i = 0; i < allProcs.length; i++) {
        const r = taskResults[i]
        taskMap[allProcs[i].id] = r.success && r.data ? r.data : []
      }
      setTasks(taskMap)

      const firstVc = vcSteps.find(vs => allProcs.some(p => p.vc_step_id === vs.id))
      if (firstVc) setActiveVcId(firstVc.id)

      setIsLoadingFromDB(false)

      const needsTasks = allProcs.filter(p => (taskMap[p.id] ?? []).length === 0)
      if (needsTasks.length > 0) {
        await generateTasks(needsTasks, taskMap)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateTasks(
    toGenerate: Process[],
    baseTaskMap: Record<string, Task[]>
  ) {
    setAiGenerating(true)
    try {
      const payload = toGenerate.map(p => ({
        processId: p.id,
        processName: p.name,
        problemDesc: p.problem_desc ?? '',
        usecaseDesc: p.usecase_desc ?? '',
        vcStepName: vcStepNames[p.vc_step_id ?? ''] ?? '',
      }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg4', processes: payload, analysisTitle }),
      })
      const json = await res.json() as Record<string, unknown>
      if (!res.ok || !json.tasks || typeof json.tasks !== 'object') return

      const aiTasks = json.tasks as Record<string, Array<{ name: string; automation: string; potential: string; tech: string }>>
      const newTaskMap = { ...baseTaskMap }

      for (const p of toGenerate) {
        const ptasks = aiTasks[p.id]
        if (!Array.isArray(ptasks) || ptasks.length === 0) continue
        const result = await saveTasksAction(p.id, ptasks)
        if (result.success && result.data) {
          newTaskMap[p.id] = result.data
        }
      }
      setTasks(newTaskMap)
    } catch {
      // AI error non-critical
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleRegenerateAll() {
    if (aiGenerating || processes.length === 0) return
    setAiGenerating(true)
    try {
      const payload = processes.map(p => ({
        processId: p.id,
        processName: p.name,
        problemDesc: p.problem_desc ?? '',
        usecaseDesc: p.usecase_desc ?? '',
        vcStepName: vcStepNames[p.vc_step_id ?? ''] ?? '',
      }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg4', processes: payload, analysisTitle }),
      })
      const json = await res.json() as Record<string, unknown>
      if (!res.ok || !json.tasks || typeof json.tasks !== 'object') return

      const aiTasks = json.tasks as Record<string, Array<{ name: string; automation: string; potential: string; tech: string }>>
      const newTaskMap = { ...tasks }

      for (const p of processes) {
        const ptasks = aiTasks[p.id]
        if (!Array.isArray(ptasks) || ptasks.length === 0) continue
        const result = await saveTasksAction(p.id, ptasks)
        if (result.success && result.data) {
          newTaskMap[p.id] = result.data
        }
      }
      setTasks(newTaskMap)
    } catch {
      // AI error non-critical
    } finally {
      setAiGenerating(false)
    }
  }

  function handleUpdateTaskLocal(
    taskId: string,
    processId: string,
    field: keyof Pick<Task, 'name' | 'automation' | 'potential' | 'tech'>,
    value: string
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
      potential: task.potential,
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
      {/* Global AI-generering-banner */}
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
                const processTasks = tasks[process.id] ?? []

                return (
                  <div
                    key={process.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: isOpen ? '2px solid #1E293B' : '2px solid #E2E8F0' }}
                  >
                    {/* Header */}
                    <button
                      onClick={() => setOpenId(isOpen ? null : process.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
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

                    {/* Body */}
                    {isOpen && (
                      <div className="bg-white px-5 py-4 flex flex-col gap-3">
                        {processTasks.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">
                            {aiGenerating ? 'Genererer oppgåver...' : 'Ingen oppgåver enno.'}
                          </p>
                        ) : (
                          processTasks.map(task => (
                            <div
                              key={task.id}
                              className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2 bg-slate-50"
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="text"
                                  value={task.name}
                                  onChange={e => handleUpdateTaskLocal(task.id, process.id, 'name', e.target.value)}
                                  onBlur={() => handleSaveTask(task.id, process.id)}
                                  className="flex-1 text-sm font-bold text-[#1E293B] bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                                />
                                <button
                                  onClick={() => handleDeleteTask(task.id, process.id)}
                                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors text-xs px-1.5 py-1 rounded hover:bg-red-50 mt-0.5"
                                  title="Slett oppgåve"
                                >
                                  ✕
                                </button>
                              </div>
                              <div
                                className="grid gap-x-3 gap-y-1.5 items-start"
                                style={{ gridTemplateColumns: '110px 1fr' }}
                              >
                                <span className="text-xs text-slate-500 font-semibold pt-1.5">Automatisering</span>
                                <textarea
                                  rows={2}
                                  value={task.automation}
                                  onChange={e => handleUpdateTaskLocal(task.id, process.id, 'automation', e.target.value)}
                                  onBlur={() => handleSaveTask(task.id, process.id)}
                                  className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none bg-white w-full leading-relaxed"
                                />
                                <span className="text-xs text-slate-500 font-semibold pt-1.5">Potensial</span>
                                <textarea
                                  rows={2}
                                  value={task.potential}
                                  onChange={e => handleUpdateTaskLocal(task.id, process.id, 'potential', e.target.value)}
                                  onBlur={() => handleSaveTask(task.id, process.id)}
                                  className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] resize-none bg-white w-full leading-relaxed"
                                />
                                <span className="text-xs text-slate-500 font-semibold pt-1.5">Teknologi</span>
                                <input
                                  type="text"
                                  value={task.tech}
                                  onChange={e => handleUpdateTaskLocal(task.id, process.id, 'tech', e.target.value)}
                                  onBlur={() => handleSaveTask(task.id, process.id)}
                                  className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#10B981] bg-white w-full"
                                />
                              </div>
                              {savingTask[task.id] && (
                                <span className="text-[10px] text-slate-400 self-end">Lagrar...</span>
                              )}
                            </div>
                          ))
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600 w-[150px]">Prosess</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600 w-[180px]">Oppgåve</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600 hidden md:table-cell">Automatisering</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-600 hidden lg:table-cell">Potensial</th>
                      <th className="text-left py-2 font-semibold text-slate-600 hidden lg:table-cell">Teknologi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map(p => {
                      const ptasks = tasks[p.id] ?? []
                      return ptasks.map((task, ti) => (
                        <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 pr-4 align-top">
                            {ti === 0 ? (
                              <span className="font-semibold text-[#1E293B]">{p.name}</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-4 align-top font-semibold text-[#1E293B]">{task.name}</td>
                          <td className="py-2 pr-4 align-top text-slate-600 hidden md:table-cell">{task.automation}</td>
                          <td className="py-2 pr-4 align-top text-slate-600 hidden lg:table-cell">{task.potential}</td>
                          <td className="py-2 align-top text-slate-500 hidden lg:table-cell">{task.tech}</td>
                        </tr>
                      ))
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
