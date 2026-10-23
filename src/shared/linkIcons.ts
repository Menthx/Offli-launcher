import { linkKind } from './links'

/** Icons a link can show; offli.md names them after `|` (French names, a few aliases) */
export const LINK_ICONS = ['discord', 'salon', 'wiki', 'site', 'youtube', 'code', 'tableur', 'telechargement'] as const
export type LinkIcon = (typeof LINK_ICONS)[number]

const ALIASES: Record<string, LinkIcon> = {
  serveur: 'discord',
  server: 'discord',
  channel: 'salon',
  canal: 'salon',
  guide: 'wiki',
  livre: 'wiki',
  book: 'wiki',
  web: 'site',
  lien: 'site',
  link: 'site',
  video: 'youtube',
  github: 'code',
  gitlab: 'code',
  tableau: 'tableur',
  sheet: 'tableur',
  sheets: 'tableur',
  excel: 'tableur',
  download: 'telechargement',
  dl: 'telechargement'
}

/** 'Téléchargement' → 'telechargement'; null for an unknown name */
export function iconName(word: string): LinkIcon | null {
  const key = word.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return (LINK_ICONS as readonly string[]).includes(key) ? (key as LinkIcon) : (ALIASES[key] ?? null)
}

/** An image picked in offli.md, already read by the main process */
export const isIconImage = (icon: string): boolean => /^data:image\/(png|jpeg|webp|gif);base64,/.test(icon)

/** Chosen icon if it is known, else from the link name and address */
export function linkIcon(url: string, label?: string, chosen?: string): LinkIcon {
  const picked = chosen && !isIconImage(chosen) ? iconName(chosen) : null
  if (picked) return picked
  const kind = linkKind(url, label)
  if (kind !== 'site') return ({ server: 'discord', channel: 'salon', wiki: 'wiki' } as const)[kind]
  const host = (/^https?:\/\/([^/]+)/i.exec(url)?.[1] ?? '').replace(/^www\./, '').toLowerCase()
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'youtube'
  if (/(^|\.)(github|gitlab)\.com$/.test(host)) return 'code'
  if (host === 'docs.google.com' && url.includes('/spreadsheets/')) return 'tableur'
  if (/(^|\.)(mega\.nz|mediafire\.com)$/.test(host)) return 'telechargement'
  return 'site'
}
