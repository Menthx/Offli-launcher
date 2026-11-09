import { type TKey, getLanguage, t } from './i18n'
import type { BaseRom, Game } from '../../shared/types'

export const PLATFORM_LABEL: Record<Game['platform'], string> = {
  pc: 'PC',
  gb: 'GB',
  gbc: 'GBC',
  gba: 'GBA',
  nds: 'NDS',
  '3ds': '3DS'
}

export function kindLabel(g: Game): string {
  return t(`format.${g.kind}`)
}

export function playtime(sec: number): string {
  if (sec < 60) return sec ? t('format.underMinute') : t('format.zero')
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h ? t('format.hours', { h, m: String(m).padStart(2, '0') }) : t('format.minutes', { m })
}

export function lastPlayed(ts?: number): string {
  if (!ts) return t('format.never')
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return t('format.today')
  if (days === 1) return t('format.yesterday')
  if (days < 14) return t('format.daysAgo', { n: days })
  if (days < 60) return t('format.weeksAgo', { n: Math.floor(days / 7) })
  return t('format.monthsAgo', { n: Math.floor(days / 30) })
}

/** Today / yesterday with the time, then the day and month */
export function noteDate(ts: number, now = Date.now()): string {
  const lang = getLanguage()
  const time = new Date(ts).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (ts >= startOfToday) return `${t('format.today')} · ${time}`
  if (ts >= startOfToday - 86_400_000) return `${t('format.yesterday')} · ${time}`
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear()
  return new Date(ts).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}

/** 3-letter codes (GBA, NDS) or internal title prefixes (GB, GBC) */
const BASE_KEYS = [
  'BPR',
  'BPG',
  'BPE',
  'AXV',
  'AXP',
  'ADA',
  'APA',
  'CPU',
  'IPK',
  'IPG',
  'IRB',
  'IRA',
  'IRE',
  'IRD'
] as const
const GB_KEYS: [string, string][] = [
  ['POKEMON RED', 'RED'],
  ['POKEMON BLUE', 'BLUE'],
  ['POKEMON GREEN', 'GREEN'],
  ['POKEMON YELLOW', 'YELLOW'],
  ['POKEMON_GLD', 'GLD'],
  ['POKEMON_SLV', 'SLV'],
  ['PM_CRYSTAL', 'CRYSTAL']
]

/** Falls back to the name stored at scan time */
export function baseGameName(base: BaseRom): string {
  const short = base.code.slice(0, 3)
  const key = (BASE_KEYS as readonly string[]).includes(short)
    ? short
    : GB_KEYS.find(([p]) => base.code.startsWith(p))?.[1]
  return key ? t(`bases.${key}` as TKey) : base.name
}
