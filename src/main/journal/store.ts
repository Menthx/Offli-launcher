import type { GameJournal, GameLink, JournalNote } from '../../shared/types'
import { normalizeUrl } from '../../shared/links'

/** Long enough for a full page of notes, short enough to keep journal.json small */
export const MAX_NOTE_LENGTH = 5000
const MAX_NOTES = 500
const MAX_LINKS = 30

export const emptyJournal = (): GameJournal => ({ notes: [], links: [], hiddenLinks: [] })

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

function cleanNote(v: unknown): JournalNote | null {
  if (!isObject(v) || typeof v.text !== 'string' || typeof v.id !== 'string') return null
  const text = v.text.trim().slice(0, MAX_NOTE_LENGTH)
  if (!text || !v.id) return null
  return { id: v.id.slice(0, 64), at: Number.isFinite(v.at) ? Number(v.at) : Date.now(), text }
}

function cleanLink(v: unknown): GameLink | null {
  if (!isObject(v) || typeof v.url !== 'string') return null
  const url = normalizeUrl(v.url)
  if (!url) return null
  const label = typeof v.label === 'string' ? v.label.trim().slice(0, 80) : ''
  return label ? { url, label } : { url }
}

/** Keeps valid notes (newest first) and http(s) links, without duplicates */
export function cleanJournal(raw: unknown): GameJournal {
  if (!isObject(raw)) return emptyJournal()
  const notes = (Array.isArray(raw.notes) ? raw.notes : [])
    .map(cleanNote)
    .filter((n): n is JournalNote => !!n)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_NOTES)
  const seen = new Set<string>()
  const links = (Array.isArray(raw.links) ? raw.links : [])
    .map(cleanLink)
    .filter((l): l is GameLink => !!l && !seen.has(l.url) && !!seen.add(l.url))
    .slice(0, MAX_LINKS)
  const hiddenLinks = (Array.isArray(raw.hiddenLinks) ? raw.hiddenLinks : [])
    .filter((u): u is string => typeof u === 'string')
    .slice(0, MAX_LINKS)
  return { notes, links, hiddenLinks }
}

/** Whole journal file; empty journals are dropped */
export function cleanJournals(raw: unknown): Record<string, GameJournal> {
  const out: Record<string, GameJournal> = {}
  if (!isObject(raw)) return out
  for (const [id, v] of Object.entries(raw)) {
    const j = cleanJournal(v)
    if (j.notes.length || j.links.length || j.hiddenLinks.length) out[id] = j
  }
  return out
}
