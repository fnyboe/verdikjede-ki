import { NextRequest, NextResponse } from 'next/server'
import { client, model } from '@/lib/ai/claude'
import type { ImageBlockParam, TextBlockParam, DocumentBlockParam } from '@anthropic-ai/sdk/resources/messages'

type ContentBlock = TextBlockParam | ImageBlockParam | DocumentBlockParam

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, beskrivelse, url, file } = body

    if (action !== 'steg1') {
      return NextResponse.json({ error: 'Ukjend action' }, { status: 400 })
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
  } catch (err) {
    console.error('[api/ai] error:', err)
    return NextResponse.json({ error: 'Intern feil' }, { status: 500 })
  }
}
