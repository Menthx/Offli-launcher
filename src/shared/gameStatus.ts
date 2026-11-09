import type { GameStatus } from './types'

export const GAME_STATUSES: GameStatus[] = ['todo', 'playing', 'done', 'dropped']

/** Longest collection name */
export const TAG_MAX_LENGTH = 40

/** Trimmed, unique (case ignored), at most TAG_MAX_LENGTH characters */
export function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of raw) {
    if (typeof v !== 'string') continue
    const tag = v.trim().replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH)
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    out.push(tag)
  }
  return out
}
