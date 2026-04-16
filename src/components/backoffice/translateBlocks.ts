import { Block } from './types'

export const TRANSLATABLE_TYPES: Block['type'][] = ['h1', 'h2', 'p']

const LANG_NAMES: Record<string, string> = {
  English: 'English',
  Hindi:   'Hindi',
  Chinese: 'Simplified Chinese',
  Arab:    'Arabic',
}

export type TranslatableField = 'contentEnglish' | 'contentHindi' | 'contentChinese' | 'contentArab'

export const LANG_FIELDS: { key: string; field: TranslatableField; label: string }[] = [
  { key: 'English', field: 'contentEnglish', label: 'EN' },
  { key: 'Hindi',   field: 'contentHindi',   label: 'HI' },
  { key: 'Chinese', field: 'contentChinese', label: 'ZH' },
  { key: 'Arab',    field: 'contentArab',    label: 'AR' },
]

/**
 * Clears translation fields for blocks whose `content` changed vs the saved version.
 * Unchanged blocks retain their existing translations.
 */
export function invalidateChangedBlocks(newBlocks: Block[], savedBlocks: Block[]): Block[] {
  return newBlocks.map((block, i) => {
    if (!TRANSLATABLE_TYPES.includes(block.type)) return block
    const saved = savedBlocks[i]
    if (saved && saved.content === block.content) return block
    // Content changed or new block — strip all translations
    const { contentEnglish: _e, contentHindi: _h, contentChinese: _z, contentArab: _a, ...rest } = block
    return rest
  })
}

/**
 * Returns a new blocks array with `field` populated for every translatable block
 * that is missing or empty in that field. `content` (Spanish) is never modified.
 */
export async function translateBlocks(
  blocks: Block[],
  field: TranslatableField,
  langKey: string
): Promise<Block[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPEN_AI
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_OPEN_AI')

  const pending: { index: number; text: string }[] = blocks
    .map((block, i) => ({ block, i }))
    .filter(({ block }) =>
      TRANSLATABLE_TYPES.includes(block.type) &&
      !!block.content?.trim() &&
      !block[field]?.trim()
    )
    .map(({ block, i }) => ({ index: i, text: block.content }))

  if (pending.length === 0) return blocks

  const langName = LANG_NAMES[langKey] ?? langKey
  const texts = pending.map((p) => p.text)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            `You are a professional translator. You will receive a JSON array of strings written in Spanish. ` +
            `Translate each string to ${langName}. ` +
            `Preserve all <b>, </b>, <i>, </i> HTML tags exactly as they appear. ` +
            `Return only a valid JSON array of the same length with the translated strings. No extra text.`,
        },
        { role: 'user', content: JSON.stringify(texts) },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  const translated: string[] = JSON.parse(data.choices[0].message.content.trim())

  const result = blocks.map((b) => ({ ...b }))
  pending.forEach(({ index }, j) => {
    result[index] = { ...result[index], [field]: translated[j] ?? '' }
  })

  return result
}

/**
 * Translates an array of plain strings from Spanish to the target language.
 * Returns a translated array of the same length.
 */
export async function translateStrings(texts: string[], langKey: string): Promise<string[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPEN_AI
  if (!apiKey) throw new Error('Missing NEXT_PUBLIC_OPEN_AI')

  const langName = LANG_NAMES[langKey] ?? langKey

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            `You are a professional translator. You will receive a JSON array of strings written in Spanish. ` +
            `Translate each string to ${langName}. ` +
            `Return only a valid JSON array of the same length with the translated strings. No extra text.`,
        },
        { role: 'user', content: JSON.stringify(texts) },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  return JSON.parse(data.choices[0].message.content.trim())
}
