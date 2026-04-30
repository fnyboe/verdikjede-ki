import { NextRequest, NextResponse } from 'next/server'
import { client, model } from '@/lib/ai/claude'
import { BXT_CATS } from '@/lib/constants'
import type { ImageBlockParam, TextBlockParam, DocumentBlockParam } from '@anthropic-ai/sdk/resources/messages'

type ContentBlock = TextBlockParam | ImageBlockParam | DocumentBlockParam

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'steg1') {
      return handleSteg1(body)
    }

    if (action === 'steg2') {
      return handleSteg2(body)
    }

    if (action === 'steg3') {
      return handleSteg3(body)
    }

    if (action === 'steg3scores') {
      return handleSteg3Scores(body)
    }

    return NextResponse.json({ error: 'Ukjend action' }, { status: 400 })
  } catch (err) {
    console.error('[api/ai] error:', err)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500 })
  }
}

async function handleSteg1(body: Record<string, unknown>) {
  const { beskrivelse, url, file } = body as {
    beskrivelse?: string
    url?: string
    file?: { data: string; mimeType: string }
  }

  if (!beskrivelse?.trim()) {
    return NextResponse.json({ error: 'Beskriving er påkravd' }, { status: 400 })
  }

  const promptText = [
    'Du er ein KI-assistent som hjelper norske bedrifter å kartlegge verdikjeden sin.',
    'Basert på beskriinga nedanfor, generer mellom 4 og 8 verdikjedesteg på norsk.',
    'Kvart steg skal vere kort og konsist (2–5 ord), og dekke heile verdikjeda frå start til slutt.',
    url ? `Nettsida til bedrifta: ${url}` : '',
    '',
    `Beskriving av bedrifta:\n${beskrivelse}`,
    '',
    'Returner KUN gyldig JSON i dette formatet, utan forklaring eller markdown:',
    '{ "steps": ["Steg 1", "Steg 2", ...] }',
  ].filter(Boolean).join('\n')

  const content: ContentBlock[] = [{ type: 'text', text: promptText }]

  const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type ValidImageType = typeof VALID_IMAGE_TYPES[number]

  if (file?.data && file?.mimeType) {
    if (VALID_IMAGE_TYPES.includes(file.mimeType as ValidImageType)) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: file.mimeType as ValidImageType, data: file.data },
      })
    } else if (file.mimeType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.data },
      })
    }
  }

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  })

  const raw = response.content.find((b) => b.type === 'text')
  if (!raw || raw.type !== 'text') {
    return NextResponse.json({ error: 'Tomt svar frå AI' }, { status: 500 })
  }

  const jsonMatch = raw.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Kunne ikkje parse AI-svar' }, { status: 500 })
  }

  const parsed = JSON.parse(jsonMatch[0]) as { steps: string[] }
  if (!Array.isArray(parsed.steps)) {
    return NextResponse.json({ error: 'Ugyldig format frå AI' }, { status: 500 })
  }

  return NextResponse.json({ steps: parsed.steps })
}

async function handleSteg2(body: Record<string, unknown>) {
  const { vcStepName, analysisTitle } = body as {
    vcStepName?: string
    analysisTitle?: string
  }

  if (!vcStepName?.trim()) {
    return NextResponse.json({ error: 'vcStepName er påkravd' }, { status: 400 })
  }

  const promptText = [
    'Du er ein KI-assistent som hjelper norske bedrifter å kartlegge prosessar i verdikjeden sin.',
    `Bedrift/analyse: ${analysisTitle ?? ''}`,
    `Verdikjedesteg: ${vcStepName}`,
    '',
    'Generer 3–6 konkrete prosessar eller aktivitetar som høyrer til dette verdikjedesteget.',
    'Kvar prosess skal vere kort og handlingsorientert (2–5 ord), på norsk.',
    '',
    'Returner KUN gyldig JSON i dette formatet, utan forklaring eller markdown:',
    '{ "processes": ["Prosess 1", "Prosess 2", ...] }',
  ].join('\n')

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: 'user', content: promptText }],
  })

  const raw = response.content.find((b) => b.type === 'text')
  if (!raw || raw.type !== 'text') {
    return NextResponse.json({ error: 'Tomt svar frå AI' }, { status: 500 })
  }

  const jsonMatch = raw.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Kunne ikkje parse AI-svar' }, { status: 500 })
  }

  const parsed = JSON.parse(jsonMatch[0]) as { processes: string[] }
  if (!Array.isArray(parsed.processes)) {
    return NextResponse.json({ error: 'Ugyldig format frå AI' }, { status: 500 })
  }

  return NextResponse.json({ processes: parsed.processes })
}

async function handleSteg3(body: Record<string, unknown>) {
  const { processName, vcStepName, analysisTitle } = body as {
    processName?: string
    vcStepName?: string
    analysisTitle?: string
  }

  if (!processName?.trim()) {
    return NextResponse.json({ error: 'processName er påkravd' }, { status: 400 })
  }

  const promptText = [
    'Du er ein KI-rådgjevar som hjelper norske bedrifter å identifisere moglegheiter for KI og automatisering.',
    `Bedrift/analyse: ${analysisTitle ?? ''}`,
    `Verdikjedesteg: ${vcStepName ?? ''}`,
    `Prosess: ${processName}`,
    '',
    'Generer to ting på norsk:',
    '1. problem: Beskriv kort (2–4 setningar) kva problem eller ineffektivitet i denne prosessen som KI kan adressere.',
    '2. ideas: List opp 3–5 konkrete idear for korleis KI eller automatisering kan brukast i denne prosessen.',
    '',
    'Returner KUN gyldig JSON i dette formatet, utan forklaring eller markdown:',
    '{ "problem": "...", "ideas": "..." }',
  ].join('\n')

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: promptText }],
  })

  const raw = response.content.find((b) => b.type === 'text')
  if (!raw || raw.type !== 'text') {
    return NextResponse.json({ error: 'Tomt svar frå AI' }, { status: 500 })
  }

  const jsonMatch = raw.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Kunne ikkje parse AI-svar' }, { status: 500 })
  }

  const parsed = JSON.parse(jsonMatch[0]) as { problem: string; ideas: string }
  if (typeof parsed.problem !== 'string' || typeof parsed.ideas !== 'string') {
    return NextResponse.json({ error: 'Ugyldig format frå AI' }, { status: 500 })
  }

  return NextResponse.json({ problem: parsed.problem, ideas: parsed.ideas })
}

async function handleSteg3Scores(body: Record<string, unknown>) {
  const { processName, problemDesc, usecaseDesc } = body as {
    processName?: string
    problemDesc?: string
    usecaseDesc?: string
  }

  if (!processName?.trim()) {
    return NextResponse.json({ error: 'processName er påkravd' }, { status: 400 })
  }

  const allItems = BXT_CATS.flatMap(cat =>
    cat.items.map(item => ({ key: item.key, label: item.label, category: cat.label, tip: item.tip }))
  )

  const itemsDesc = allItems
    .map(i => `- ${i.key} (${i.category} → ${i.label}): ${i.tip}`)
    .join('\n')

  const promptText = [
    'Du er ein KI-rådgjevar som vurderer kor eigna ein prosess er for KI-implementering.',
    `Prosess: ${processName}`,
    problemDesc?.trim() ? `Problem: ${problemDesc}` : '',
    usecaseDesc?.trim() ? `KI-brukstilfelle: ${usecaseDesc}` : '',
    '',
    'Gi ein score frå 1 til 5 for kvart av desse kriteria basert på prosessen ovanfor:',
    '',
    itemsDesc,
    '',
    'Returner KUN gyldig JSON i dette formatet, utan forklaring eller markdown:',
    `{ "scores": { ${allItems.map(i => `"${i.key}": 3`).join(', ')} } }`,
    'Alle nøklar må vere med. Verdiane skal vere heiltal mellom 1 og 5.',
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: 'user', content: promptText }],
  })

  const raw = response.content.find((b) => b.type === 'text')
  if (!raw || raw.type !== 'text') {
    return NextResponse.json({ error: 'Tomt svar frå AI' }, { status: 500 })
  }

  const jsonMatch = raw.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Kunne ikkje parse AI-svar' }, { status: 500 })
  }

  const parsed = JSON.parse(jsonMatch[0]) as { scores: Record<string, number> }
  if (!parsed.scores || typeof parsed.scores !== 'object') {
    return NextResponse.json({ error: 'Ugyldig format frå AI' }, { status: 500 })
  }

  const validatedScores: Record<string, number> = {}
  for (const { key } of allItems) {
    const val = Number(parsed.scores[key])
    validatedScores[key] = isNaN(val) ? 3 : Math.min(5, Math.max(1, Math.round(val)))
  }

  return NextResponse.json({ scores: validatedScores })
}
