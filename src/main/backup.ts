import { GAME_STATUSES, cleanTags } from '../shared/gameStatus'
import type { GameJournal, GameStats, Settings } from '../shared/types'
import { cleanJournals } from './journal/store'
import { mergeSettings } from './store'

/** Player data backup (favorites, play time, notes, names, covers, settings); the SteamGridDB key is never exported */
export const BACKUP_FORMAT = 'offli-launcher-backup'

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: 1
  exportedAt: string
  settings: Settings
  stats: Record<string, GameStats>
  /** Absent from backups made before the journal existed */
  journal?: Record<string, GameJournal>
}

export function makeBackup(
  settings: Settings,
  stats: Record<string, GameStats>,
  now = new Date(),
  journal: Record<string, GameJournal> = {}
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    settings: { ...settings, steamGridDbKey: '', hasSteamGridDbKey: undefined },
    stats,
    journal
  }
}

function cleanStats(raw: unknown): Record<string, GameStats> {
  const out: Record<string, GameStats> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, v] of Object.entries(raw as Record<string, Partial<GameStats>>)) {
    if (!v || typeof v !== 'object') continue
    out[id] = {
      playtimeSec: Number.isFinite(v.playtimeSec) ? Math.max(0, Number(v.playtimeSec)) : 0,
      favorite: v.favorite === true,
      ...(Number.isFinite(v.lastPlayed) ? { lastPlayed: Number(v.lastPlayed) } : {}),
      ...(v.status && GAME_STATUSES.includes(v.status) ? { status: v.status } : {}),
      ...(cleanTags(v.tags).length ? { tags: cleanTags(v.tags) } : {})
    }
  }
  return out
}

/** Settings go through mergeSettings and keep the current key; null if the file isn't a backup */
export function readBackup(
  text: string,
  current: Settings
): { settings: Settings; stats: Record<string, GameStats>; journal?: Record<string, GameJournal> } | null {
  let data: Partial<Backup>
  try {
    data = JSON.parse(text) as Partial<Backup>
  } catch {
    return null
  }
  if (data?.format !== BACKUP_FORMAT || !data.settings || typeof data.settings !== 'object') return null
  const settings = mergeSettings(current, {
    ...data.settings,
    steamGridDbKey: current.steamGridDbKey
  })
  return {
    settings,
    stats: cleanStats(data.stats),
    ...(data.journal !== undefined ? { journal: cleanJournals(data.journal) } : {})
  }
}
