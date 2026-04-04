import { FieldDef } from './types'

export const TOOLBAR_BTN =
  'px-2 py-1 text-xs bg-[#222] border border-gray-700 rounded hover:border-[#f4c430] hover:text-[#f4c430] transition-colors'

export const INPUT_BASE =
  'w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors'

export const emptyForm = (fields: FieldDef[]): Record<string, any> => {
  const form: Record<string, any> = {}
  fields.forEach((f) => {
    form[f.key] = f.type === 'checkbox' ? false : ''
  })
  return form
}

export function toVideoEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return url
}

export function videoHTML(url: string): string {
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const embedUrl = toVideoEmbed(url)
  if (isYoutube) {
    return `<div style="text-align:center;margin:1.2rem 0;"><iframe style="width:500px;max-width:100%;aspect-ratio:16/9;display:inline-block;" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`
  }
  return `<div style="text-align:center;margin:1.2rem 0;"><video src="${url}" controls style="width:500px;max-width:100%;height:auto;display:inline-block;"></video></div>`
}
