import { type TKey, getLanguage, t } from '../../i18n'
import type { Game, GameStats, LibrarySort } from '../../../../shared/types'

export type Filter = 'all' | 'fav' | 'fangame' | 'gba' | 'nds' | 'gb' | '3ds' | 'new' | 'base'

/** A label containing a dot is a translation key */
export const FILTERS: { id: Filter; label: TKey | string; group?: TKey }[] = [
  { id: 'all', label: 'library.all', group: 'library.groupLibrary' },
  { id: 'fav', label: 'library.favorites' },
  { id: 'new', label: 'library.neverPlayed' },
  {
    id: 'fangame',
    label: 'library.pcFangames',
    group: 'library.groupPlatforms'
  },
  { id: 'gba', label: 'GBA' },
  { id: 'nds', label: 'NDS' },
  { id: 'gb', label: 'GB / GBC' },
  { id: '3ds', label: '3DS' },
  { id: 'base', label: 'library.baseRoms', group: 'library.groupOther' }
]

const text = (label: string): string => (label.includes('.') ? t(label as TKey) : label)

/** Favorites first (a favorite also stays in its category), then sidebar order */
export const SECTIONS: { filter: Filter; label(): string }[] = [
  { filter: 'fav', label: () => t('library.favorites') },
  { filter: 'fangame', label: () => t('library.sectionFangames') },
  {
    filter: 'gba',
    label: () => t('library.sectionRomhacks', { platform: 'GBA' })
  },
  {
    filter: 'nds',
    label: () => t('library.sectionRomhacks', { platform: 'NDS' })
  },
  {
    filter: 'gb',
    label: () => t('library.sectionRomhacks', { platform: 'GB / GBC' })
  },
  {
    filter: '3ds',
    label: () => t('library.sectionRomhacks', { platform: '3DS' })
  }
]

export const filterLabel = (f: Filter): string => text(FILTERS.find((x) => x.id === f)!.label)
export const groupLabel = (group: TKey): string => t(group)

export function matches(f: Filter, g: Game, s: GameStats | undefined): boolean {
  // Unmodified official ROMs have their own entry
  if (g.kind === 'baserom' || f === 'base') return f === 'base' && g.kind === 'baserom'
  switch (f) {
    case 'all':
      return true
    case 'fav':
      return !!s?.favorite
    case 'new':
      return !s?.lastPlayed
    case 'fangame':
      return g.kind === 'fangame'
    case 'gb':
      return g.platform === 'gb' || g.platform === 'gbc'
    default:
      return g.platform === f
  }
}

/** Matches the shown name or the original name */
export function matchesQuery(g: Game, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || g.name.toLowerCase().includes(q) || !!g.originalName?.toLowerCase().includes(q)
}

export function filterGames(games: Game[], stats: Record<string, GameStats>, f: Filter, query: string): Game[] {
  return games.filter((g) => matches(f, g, stats[g.id]) && matchesQuery(g, query))
}

/** Last 8 played games, newest first */
export function recentGames(games: Game[], stats: Record<string, GameStats>): Game[] {
  return games
    .filter((g) => stats[g.id]?.lastPlayed)
    .sort((a, b) => (stats[b.id]!.lastPlayed ?? 0) - (stats[a.id]!.lastPlayed ?? 0))
    .slice(0, 8)
}

/** In the sectioned view: first game of the first non-empty section */
export function firstShown(visible: Game[], stats: Record<string, GameStats>, f: Filter): Game | undefined {
  if (f !== 'all') return visible[0]
  return SECTIONS.flatMap((sec) => visible.filter((g) => matches(sec.filter, g, stats[g.id])))[0]
}

export const SORTS: { id: LibrarySort; label: TKey }[] = [
  { id: 'name', label: 'library.sortName' },
  { id: 'recent', label: 'library.sortRecent' },
  { id: 'playtime', label: 'library.sortPlaytime' }
]

/** Name breaks ties (in the UI language); the input list is not modified */
export function sortGames(games: Game[], stats: Record<string, GameStats>, sort: LibrarySort): Game[] {
  const byName = (a: Game, b: Game): number => a.name.localeCompare(b.name, getLanguage(), { sensitivity: 'base' })
  const num = (g: Game): number =>
    sort === 'recent' ? (stats[g.id]?.lastPlayed ?? 0) : sort === 'playtime' ? (stats[g.id]?.playtimeSec ?? 0) : 0
  return [...games].sort((a, b) => num(b) - num(a) || byName(a, b))
}
