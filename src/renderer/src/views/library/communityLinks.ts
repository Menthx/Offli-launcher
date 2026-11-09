import { type LinkIcon, linkIcon } from '../../../../shared/linkIcons'
import type { DetectedLink, GameJournal, GameLink } from '../../../../shared/types'
import type { IconName } from '../../components/icons'

export const ICONS: Record<LinkIcon, IconName> = {
  discord: 'chat',
  salon: 'hash',
  wiki: 'book',
  site: 'external',
  youtube: 'video',
  code: 'code',
  tableur: 'sheet',
  telechargement: 'download'
}

export interface LinkRow {
  url: string
  /** Name given by the player, offli.md or a shortcut (default label otherwise) */
  name?: string
  /** As saved: icon name or image data URL (offli.md) */
  chosen?: string
  icon: LinkIcon
  /** File it was found in, for detected links */
  file?: string
}

/** Host and path without the scheme, as people write it */
export const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export const toLink = (url: string, label: string, icon?: string): GameLink => ({
  url,
  ...(label ? { label } : {}),
  ...(icon ? { icon } : {})
})

const toRow = (l: GameLink | DetectedLink): Omit<LinkRow, 'file'> => ({
  url: l.url,
  name: l.label,
  chosen: l.icon,
  icon: linkIcon(l.url, l.label, l.icon)
})

/** The player's links, then the detected ones they haven't added or hidden */
export function linkRows(j: GameJournal | undefined, detected: DetectedLink[]): LinkRow[] {
  const own = new Set(j?.links.map((l) => l.url))
  return [
    ...(j?.links ?? []).map(toRow),
    ...detected
      .filter((d) => !own.has(d.url) && !j?.hiddenLinks.includes(d.url))
      .map((d) => ({ ...toRow(d), file: d.file }))
  ]
}

const hide = (j: GameJournal, url: string): string[] =>
  j.hiddenLinks.includes(url) ? j.hiddenLinks : [...j.hiddenLinks, url]

/** A detected link is hidden; the player's own is deleted */
export function removeLink(j: GameJournal, row: LinkRow): GameJournal {
  return row.file ? { ...j, hiddenLinks: hide(j, row.url) } : { ...j, links: j.links.filter((l) => l.url !== row.url) }
}

/** An edited detected link becomes the player's own, and the found one is hidden */
export function replaceLink(j: GameJournal, row: LinkRow, link: GameLink): GameJournal {
  const links = j.links.filter((l) => l.url !== link.url || l.url === row.url)
  if (row.file) return { ...j, links: [...links, link], hiddenLinks: hide(j, row.url) }
  return { ...j, links: links.map((l) => (l.url === row.url ? link : l)) }
}
