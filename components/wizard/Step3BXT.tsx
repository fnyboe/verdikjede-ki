'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProcessesForVcStepAction, saveProcessDescAction } from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import type { VcStep, Process } from '@/types'

interface Props {
  analyseId: string
  analysisTitle: string
  vcSteps: VcStep[]
}

export function Step3BXT({ analyseId, analysisTitle, vcSteps }: Props) {
  const router = useRouter()

  const vcStepNames = Object.fromEntries(vcSteps.map((vs) => [vs.id, vs.name]))

  const [processes, setProcesses] = useState<Process[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, { problem_desc: string; usecase_desc: string }>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(true)

  useEffect(() => {
    Promise.all(
      vcSteps.map((vs) => getProcessesForVcStepAction(vs.id).then((r) => ({ r })))
    ).then((results) => {
      const included: Process[] = []
      for (const { r } of results) {
        if (r.success && r.data) {
          included.push(...r.data.filter((p) => p.included))
        }
      }
      setProcesses(included)
      setFields(
        Object.fromEntries(
          included.map((p) => [p.id, { problem_desc: p.problem_desc ?? '', usecase_desc: p.usecase_desc ?? '' }])
        )
      )
      setIsLoadingFromDB(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleOpen(process: Process) {
    if (openId === process.id) {
      setOpenId(null)
      return
    }
    setOpenId(process.id)

    if (process.problem_desc || process.usecase_desc || process.ai_suggestion) return

    const vsName = vcStepNames[process.vc_step_id ?? ''] ?? ''
    setAiLoading((prev) => ({ ...prev, [process.id]: true }))
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg3', processName: process.name, vcStepName: vsName, analysisTitle }),
      })
      const json = await res.json()
      if (res.ok && typeof json.problem === 'string' && typeof json.ideas === 'string') {
        setFields((prev) => ({
          ...prev,
          [process.id]: { problem_desc: json.problem, usecase_desc: json.ideas },
        }))
        const cached = JSON.stringify({ problem: json.problem, ideas: json.ideas })
        await saveProcessDescAction(process.id, json.problem, json.ideas, cached)
        setProcesses((prev) =>
          prev.map((p) =>
            p.id === process.id
              ? { ...p, problem_desc: json.problem, usecase_desc: json.ideas, ai_suggestion: cached }
              : p
          )
        )
      }
    } catch {
      // AI-feil er ikkje kritisk
    } finally {
      setAiLoading((prev) => ({ ...prev, [process.id]: false }))
    }
  }

  async function handleSave(processId: string) {
    setSaveError(null)
    setSaving((prev) => ({ ...prev, [processId]: true }))
    const f = fields[processId]
    const currentAiSuggestion = processes.find((p) => p.id === processId)?.ai_suggestion ?? null
    const result = await saveProcessDescAction(processId, f.problem_desc, f.usecase_desc, currentAiSuggestion)
    if (!result.success) {
      setSaveError(result.error ?? 'Kunne ikkje lagre')
    }
    setSaving((prev) => ({ ...prev, [processId]: false }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-2">
        <h2 className="text-base font-semibold text-[#1E293B]">KI-analyse per prosess</h2>
        <p className="text-sm text-slate-500">
          Opne kvar prosess for å sjå KI-genererte forslag til problem og bruksområde. Rediger og lagre.
        </p>
      </div>

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
          {processes.map((process) => {
            const isOpen = openId === process.id
            const isAiLoading = aiLoading[process.id] ?? false
            const isSaving = saving[process.id] ?? false
            const f = fields[process.id] ?? { problem_desc: '', usecase_desc: '' }
            const hasSavedContent = !!(process.problem_desc || process.usecase_desc)

            return (
              <div key={process.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => handleOpen(process)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1E293B] truncate">{process.name}</p>
                      <p className="text-xs text-slate-400">{vcStepNames[process.vc_step_id ?? ''] ?? ''}</p>
                    </div>
                    {isAiLoading && (
                      <span className="text-xs text-[#10B981] animate-pulse font-medium shrink-0">Genererer...</span>
                    )}
                    {hasSavedContent && !isAiLoading && (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">✓</span>
                    )}
                  </div>
                  <span className="text-slate-400 text-sm ml-4 shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100">
                    {isAiLoading && (
                      <div className="flex items-center gap-2 pt-4">
                        <svg className="animate-spin h-4 w-4 text-[#10B981] shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-sm font-medium text-[#10B981]">Genererer KI-forslag...</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 mt-4">
                      <label className="text-sm font-medium text-[#1E293B]">Problembeskrivelse</label>
                      <p className="text-xs text-slate-400">Kva problem eller ineffektivitet i denne prosessen kan KI adressere?</p>
                      <textarea
                        value={f.problem_desc}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [process.id]: { ...prev[process.id], problem_desc: e.target.value },
                          }))
                        }
                        rows={4}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                        placeholder="Beskriv problemet..."
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-[#1E293B]">KI-bruksområde</label>
                      <p className="text-xs text-slate-400">Konkrete idear for korleis KI eller automatisering kan brukast her.</p>
                      <textarea
                        value={f.usecase_desc}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [process.id]: { ...prev[process.id], usecase_desc: e.target.value },
                          }))
                        }
                        rows={4}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none"
                        placeholder="Beskriv bruksområde..."
                      />
                    </div>

                    <Button
                      onClick={() => handleSave(process.id)}
                      disabled={isSaving}
                      className="self-start bg-[#1E293B] hover:bg-slate-700 text-white disabled:opacity-50"
                    >
                      {isSaving ? 'Lagrar...' : 'Lagre'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
      )}

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
