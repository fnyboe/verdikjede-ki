import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514'

export { client, model }
