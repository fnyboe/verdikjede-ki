'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveVcStepsAction, saveCompanyInfoAction } from '@/app/(app)/analyse/[id]/steg/[steg]/actions'
import { Button } from '@/components/ui/button'
import type { VcStep, Analysis } from '@/types'

interface Props {
  analyseId: string
  eksisterendeSteg: VcStep[]
  analysis: Analysis
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function Step1Verdikjede({ analyseId, eksisterendeSteg, analysis }: Props) {
  const router = useRouter()
  const harEksisterande = eksisterendeSteg.length > 0

  const [steg, setSteg] = useState<string[]>(
    harEksisterande ? eksisterendeSteg.map((s) => s.name) : ['', '']
  )
  const [beskrivelse, setBeskrivelse] = useState(analysis.company_description ?? '')
  const [url, setUrl] = useState(analysis.website_url ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState(analysis.company_name ?? '')
  const [logoDataUri, setLogoDataUri] = useState<string | null>(analysis.logo_base64 ?? null)
  const [logoError, setLogoError] = useState<string | null>(null)

  const filledCount = steg.filter((s) => s.trim().length > 0).length
  const kanGaaNeste = filledCount >= 2

  async function handleSaveCompanyInfo(name: string, logo: string | null) {
    await saveCompanyInfoAction(analyseId, {
      company_name: name,
      logo_base64: logo,
      company_description: beskrivelse,
      website_url: url,
    })
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null)
    const f = e.target.files?.[0]
    if (!f) return

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(f.type)) {
      setLogoError('Kun PNG og JPG er støtta')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setLogoError('Fila er for stor (maks 2 MB)')
      return
    }

    const dataUri = await fileToDataUri(f)
    setLogoDataUri(dataUri)
    await handleSaveCompanyInfo(companyName, dataUri)
  }

  async function handleLagForslag() {
    if (!beskrivelse.trim()) {
      setAiError('Du må fylle inn beskriving av selskapet')
      return
    }
    setAiError(null)
    setAiLoading(true)

    try {
      let filePayload: { data: string; mimeType: string } | undefined
      if (file) {
        const data = await fileToBase64(file)
        filePayload = { data, mimeType: file.type }
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'steg1', beskrivelse, url: url || undefined, file: filePayload }),
      })

      const json = await res.json()

      if (!res.ok || !json.steps) {
        setAiError(json.error ?? 'Noko gjekk gale med AI-kallet')
        return
      }

      setSteg(json.steps as string[])
    } catch {
      setAiError('Kunne ikkje kontakte AI-tenesta')
    } finally {
      setAiLoading(false)
    }
  }

  function oppdaterSteg(i: number, value: string) {
    setSteg((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  function fjernSteg(i: number) {
    setSteg((prev) => prev.filter((_, idx) => idx !== i))
  }

  function leggTilSteg() {
    setSteg((prev) => [...prev, ''])
  }

  async function handleNeste() {
    setSaveError(null)
    setSaving(true)
    const result = await saveVcStepsAction(analyseId, steg)
    if (!result.success) {
      setSaveError(result.error ?? 'Kunne ikkje lagre steg')
      setSaving(false)
      return
    }
    router.refresh()
    router.push(`/analyse/${analyseId}/steg/2`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Om selskapet</h2>
          <p className="text-sm text-slate-500">Fyll inn informasjon om selskapet så KI kan foreslå verdikjedesteg.</p>
        </div>

        {/* Namn på bedrift */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E293B]">Namn på bedrift</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onBlur={() => handleSaveCompanyInfo(companyName, logoDataUri)}
            placeholder="Skriv inn bedriftsnamnet..."
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          />
        </div>

        {/* Last opp logo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E293B]">Logo (valfritt)</label>
          <div className="flex items-center gap-4">
            {logoDataUri && (
              <img
                src={logoDataUri}
                alt="Logo"
                className="h-12 w-auto object-contain rounded border border-slate-200 bg-slate-50 p-1"
              />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoChange}
              className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          {logoError
            ? <p className="text-xs text-red-500">{logoError}</p>
            : <p className="text-xs text-slate-400">PNG eller JPG – maks 2 MB. Visast på forsida av rapporten.</p>
          }
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E293B]">
            Beskriving av selskapet <span className="text-red-500">*</span>
          </label>
          <textarea
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            onBlur={() => handleSaveCompanyInfo(companyName, logoDataUri)}
            placeholder="Beskriv kva selskapet gjer, kva bransje det er i, og kva produkt/tenester det tilbyr..."
            rows={4}
            disabled={harEksisterande}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] resize-none disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E293B]">Nettside (valfritt)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => handleSaveCompanyInfo(companyName, logoDataUri)}
            placeholder="https://eksempel.no"
            disabled={harEksisterande}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E293B]">Dokument/bilde (valfritt)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={harEksisterande}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
          />
          <p className="text-xs text-slate-400">Bilde eller PDF – maks 5 MB</p>
        </div>

        {aiError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>
        )}

        {harEksisterande && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Det finst allereie verdikjedesteg for denne analysen. Rediger stega direkte nedanfor.
          </p>
        )}

        <Button
          onClick={handleLagForslag}
          disabled={harEksisterande || aiLoading}
          className="self-start bg-[#1E293B] hover:bg-slate-700 text-white"
        >
          {aiLoading ? 'Genererer forslag...' : '✦ Lag forslag'}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1E293B] mb-1">Verdikjedesteg</h2>
          <p className="text-sm text-slate-500">Rediger, legg til eller fjern steg. Minimum 2 steg krevst.</p>
        </div>

        <div className="flex flex-col gap-2">
          {steg.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">{i + 1}</span>
              <input
                type="text"
                value={s}
                onChange={(e) => oppdaterSteg(i, e.target.value)}
                placeholder={`Steg ${i + 1}`}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              />
              <button
                onClick={() => fjernSteg(i)}
                className="text-slate-400 hover:text-red-500 transition-colors px-1"
                title="Fjern steg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={leggTilSteg}
          className="self-start text-sm text-[#3B82F6] hover:underline"
        >
          + Legg til steg
        </button>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
      )}

      <div className="flex justify-between">
        <a
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          ← Tilbake til dashboard
        </a>
        <Button
          onClick={handleNeste}
          disabled={!kanGaaNeste || saving}
          className="bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-50"
        >
          {saving ? 'Lagrar...' : 'Neste steg →'}
        </Button>
      </div>
    </div>
  )
}
