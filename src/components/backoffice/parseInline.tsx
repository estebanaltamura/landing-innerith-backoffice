import { ReactNode } from 'react'

/**
 * Converts a string with literal <b>...</b> and <i>...</i> tags into React nodes.
 * No dangerouslySetInnerHTML. Supports nesting (e.g. <b><i>text</i></b>).
 */
export function parseInline(text: string): ReactNode[] {
  return parse(text)
}

function parse(text: string, key = ''): ReactNode[] {
  const result: ReactNode[] = []
  const regex = /<(b|i)>([\s\S]*?)<\/\1>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index))
    }
    const tag = match[1] as 'b' | 'i'
    const inner = match[2]
    const children = parse(inner, `${key}-${match.index}`)
    if (tag === 'b') {
      result.push(<strong key={`${key}-b-${match.index}`}>{children}</strong>)
    } else {
      result.push(<em key={`${key}-i-${match.index}`}>{children}</em>)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}
