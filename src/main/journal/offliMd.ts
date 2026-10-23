import { normalizeUrl } from '../../shared/links'

/** Info file a fangame can ship next to Game.exe (template: docs/offli.md) */
export const OFFLI_MD = 'offli.md'

/** Template addresses still to fill in */
const PLACEHOLDER = /x{4,}/i

/** Lines of the "Liens" section: `- Name : address`, `- Name: <address>` or `- [Name](address)` */
export function parseOffliMd(text: string): { url: string; label?: string }[] {
  const out: { url: string; label?: string }[] = []
  let inLinks = false
  for (const raw of text.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      inLinks = /^(liens|links|enlaces)\b/i.test(heading[1])
      continue
    }
    if (!inLinks || !/^[-*]\s/.test(line)) continue
    const item = line.slice(2).trim()
    const m =
      /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(item) ??
      (/^https?:/i.test(item) ? null : /^([^:]+?)\s*:\s*<?(\S+?)>?$/.exec(item))
    const [label, address] = m ? [m[1].trim(), m[2]] : ['', item]
    if (PLACEHOLDER.test(address)) continue
    const url = normalizeUrl(address)
    if (url) out.push(label ? { url, label } : { url })
  }
  return out
}

/** Windows internet shortcut: `URL=` line, named after the file ("Useful Links - Items" → "Items") */
export function parseUrlShortcut(text: string, fileName: string): { url: string; label?: string } | null {
  const url = normalizeUrl(/^URL=(.+)$/im.exec(text)?.[1] ?? '')
  if (!url) return null
  const label = fileName
    .replace(/\.url$/i, '')
    .replace(/^(useful\s+links?|liens?(\s+utiles)?)\s*[-–:]\s*/i, '')
    .trim()
  return label ? { url, label } : { url }
}
