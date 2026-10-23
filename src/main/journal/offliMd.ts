import { normalizeUrl } from '../../shared/links'

/** Info file a fangame can ship next to Game.exe (template: docs/offli.md) */
export const OFFLI_MD = 'offli.md'

/** Template addresses still to fill in */
const PLACEHOLDER = /x{4,}/i

export interface OffliLink {
  url: string
  label?: string
  /** What follows `|`: an icon name or an image file of the game folder, not checked yet */
  icon?: string
}

/** Lines of the "Liens" section: `- Name : address`, `- Name: <address>` or `- [Name](address)`, then `| icon` */
export function parseOffliMd(text: string): OffliLink[] {
  const out: OffliLink[] = []
  let inLinks = false
  for (const raw of text.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      inLinks = /^(liens|links|enlaces)\b/i.test(heading[1])
      continue
    }
    if (!inLinks || !/^[-*]\s/.test(line)) continue
    const [item, icon] = line
      .slice(2)
      .trim()
      .split(/\s+\|\s+/)
    const m =
      /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(item) ??
      (/^https?:/i.test(item) ? null : /^([^:]+?)\s*:\s*<?(\S+?)>?$/.exec(item))
    const [label, address] = m ? [m[1].trim(), m[2]] : ['', item]
    if (PLACEHOLDER.test(address)) continue
    const url = normalizeUrl(address)
    if (url) out.push({ url, ...(label ? { label } : {}), ...(icon?.trim() ? { icon: icon.trim() } : {}) })
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
