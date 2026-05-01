'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveStrategyAction } from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import { STRATS } from '@/lib/constants'
import type { Analysis, Task } from '@/types'

interface Props {
  analyseId: string
  analysisTitle: string
  analysis: Analysis
  initialTasks: Task[]
}

type VcControl = 'low' | 'high'
type TechBreadth = 'few' | 'many'

function getStrategyKey(vc: VcControl, tech: TechBreadth): string {
  if (vc === 'low'  && tech === 'few')  return 'focused'
  if (vc === 'low'  && tech === 'many') return 'collaborative'
  if (vc === 'high' && tech === 'few')  return 'vertical'
  return 'platform'
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0 text-[#10B981]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function Step5Strategi({ analyseId, analysisTitle, analysis, initialTasks }: Props) {
  const router = useRouter()

  const [vcControl, setVcControl] = useState<VcControl | null>(
    (analysis.vc_control as VcControl | null) ?? null
  )
  const [techBreadth, setTechBreadth] = useState<TechBreadth | null>(
    (analysis.tech_breadth as TechBreadth | null) ?? null
  )
  const [strategyText, setStrategyText] = useState<string | null>(
    analysis.strategy_text ?? null
  )
  const [tasks] = useState<Task[]>(initialTasks)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    if (!vcControl || !techBreadth) return
    const key = getStrategyKey(vcControl, techBreadth)

    // Skip if cached text matches current selection
    if (
      strategyText &&
      analysis.vc_control === vcControl &&
      analysis.tech_breadth === techBreadth
    ) return

    generateStrategyText(key, vcControl, techBreadth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcControl, techBreadth])

  async function generateStrategyText(key: string, vc: VcControl, tech: TechBreadth) {
    const strat = STRATS[key]
    if (!strat) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'steg5',
          strategyKey: key,
          strategyTitle: strat.title,
          analysisTitle,
          tasks: tasks.map(t => ({ name: t.name, tech: t.tech })),
        }),
      })
      const json = await res.json() as Record<string, unknown>
      if (!res.ok || typeof json.strategy_text !== 'string') {
        setAiError('Kunne ikkje generere strategitekst. Prøv igjen.')
        return
      }
      const text = json.strategy_text as string
      setStrategyText(text)
      await saveStrategyAction(analyseId, { vc_control: vc, tech_breadth: tech, strategy_text: text })
    } catch {
      setAiError('Nettverksfeil ved generering av strategitekst.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSelect(vc: VcControl | null, tech: TechBreadth | null) {
    const newVc = vc ?? vcControl
    const newTech = tech ?? techBreadth
    if (vc !== null) setVcControl(vc)
    if (tech !== null) setTechBreadth(tech)
    if (newVc && newTech) {
      await saveStrategyAction(analyseId, { vc_control: newVc, tech_breadth: newTech, strategy_text: strategyText ?? null })
    }
  }

  const strategyKey = vcControl && techBreadth ? getStrategyKey(vcControl, techBreadth) : null

  const matrixEntries: Array<{ key: string; vc: VcControl; tech: TechBreadth }> = [
    { key: 'collaborative', vc: 'low',  tech: 'many' },
    { key: 'platform',      vc: 'high', tech: 'many' },
    { key: 'focused',       vc: 'low',  tech: 'few'  },
    { key: 'vertical',      vc: 'high', tech: 'few'  },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Del A – Spørsmål */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">A</span>
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Strategival</h3>
            <p className="text-sm text-slate-500">Svar på to spørsmål for å finne rett implementeringsstrategi.</p>
          </div>
        </div>

        {/* Spørsmål 1 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#1E293B]">Verdikjedekontroll</p>
          <p className="text-xs text-slate-500">I kva grad kontrollerer de heile verdikjeda – frå råvare til sluttbrukar?</p>
          <div className="flex gap-3 flex-wrap">
            {(['low', 'high'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleSelect(v, null)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  vcControl === v
                    ? 'bg-[#1E293B] text-white border-[#1E293B]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {v === 'low' ? 'Lav kontroll' : 'Høy kontroll'}
              </button>
            ))}
          </div>
        </div>

        {/* Spørsmål 2 */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#1E293B]">Teknologisk breidde</p>
          <p className="text-xs text-slate-500">Kor mange ulike KI-teknologiar og -verktøy planlegg de å ta i bruk?</p>
          <div className="flex gap-3 flex-wrap">
            {(['few', 'many'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleSelect(null, v)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  techBreadth === v
                    ? 'bg-[#1E293B] text-white border-[#1E293B]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {v === 'few' ? 'Få teknologiar' : 'Mange teknologiar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Del B – 2×2 matrise */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">B</span>
          <div>
            <h3 className="text-base font-bold text-[#1E293B]">Strategioversikt</h3>
            <p className="text-sm text-slate-500">Anbefalt strategi er highlighta basert på vala dine.</p>
          </div>
        </div>

        {/* Matrise */}
        <div className="flex flex-col gap-1">
          {/* Topprad: kolonnelabels */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
            <div />
            <div className="text-center text-xs font-semibold text-slate-500 pb-1">Lav kontroll</div>
            <div className="text-center text-xs font-semibold text-slate-500 pb-1">Høy kontroll</div>
          </div>
          {/* Mange teknologiar */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
            <div className="flex items-center justify-end pr-2">
              <span className="text-xs font-semibold text-slate-500 text-right leading-tight">Mange tek.</span>
            </div>
            {(['collaborative', 'platform'] as const).map(key => {
              const strat = STRATS[key]
              const isSelected = strategyKey === key
              return (
                <div
                  key={key}
                  className="rounded-xl p-4 flex flex-col gap-2 transition-all"
                  style={{
                    background: isSelected ? strat.bg : '#F8FAFC',
                    border: isSelected ? `2px solid ${strat.color}` : '2px solid #E2E8F0',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: strat.color, color: '#fff' }}
                    >
                      {strat.sub}
                    </span>
                    {isSelected && <span className="text-xs font-bold" style={{ color: strat.color }}>✓ Anbefalt</span>}
                  </div>
                  <p className="text-sm font-bold text-[#1E293B]">{strat.title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{strat.desc}</p>
                  {isSelected && (
                    <ul className="flex flex-col gap-0.5 mt-1">
                      {strat.actions.map((a, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1">
                          <span style={{ color: strat.color }}>→</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
          {/* Få teknologiar */}
          <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
            <div className="flex items-center justify-end pr-2">
              <span className="text-xs font-semibold text-slate-500 text-right leading-tight">Få tek.</span>
            </div>
            {(['focused', 'vertical'] as const).map(key => {
              const strat = STRATS[key]
              const isSelected = strategyKey === key
              return (
                <div
                  key={key}
                  className="rounded-xl p-4 flex flex-col gap-2 transition-all"
                  style={{
                    background: isSelected ? strat.bg : '#F8FAFC',
                    border: isSelected ? `2px solid ${strat.color}` : '2px solid #E2E8F0',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: strat.color, color: '#fff' }}
                    >
                      {strat.sub}
                    </span>
                    {isSelected && <span className="text-xs font-bold" style={{ color: strat.color }}>✓ Anbefalt</span>}
                  </div>
                  <p className="text-sm font-bold text-[#1E293B]">{strat.title}</p>
                  <p className="text-xs text-slate-500 leading-snug">{strat.desc}</p>
                  {isSelected && (
                    <ul className="flex flex-col gap-0.5 mt-1">
                      {strat.actions.map((a, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1">
                          <span style={{ color: strat.color }}>→</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Del C – KI-strategitekst */}
      {(vcControl && techBreadth) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1E293B] text-white text-sm font-bold shrink-0">C</span>
            <div>
              <h3 className="text-base font-bold text-[#1E293B]">KI-generert implementeringsplan</h3>
              <p className="text-sm text-slate-500">Basert på valt strategi og analyserte oppgåver.</p>
            </div>
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner />
              <p className="text-sm font-medium text-[#10B981]">Genererer strategitekst...</p>
            </div>
          ) : aiError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {aiError}
              <button
                onClick={() => strategyKey && generateStrategyText(strategyKey, vcControl, techBreadth)}
                className="ml-3 text-red-700 underline hover:no-underline"
              >
                Prøv igjen
              </button>
            </div>
          ) : strategyText ? (
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
              {strategyText}
            </div>
          ) : null}
        </div>
      )}

      {/* Navigasjon */}
      <div className="flex justify-between">
        <Button
          onClick={() => { router.refresh(); router.push(`/analyse/${analyseId}/steg/4`) }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600"
        >
          ← Førre steg
        </Button>
      </div>
    </div>
  )
}
