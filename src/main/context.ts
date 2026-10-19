import { type BrowserWindow, app } from 'electron'
import { join } from 'node:path'
import type { Game, GameStats, Settings } from '../shared/types'
import type { HashCache } from './baseRoms'
import { CoverResolver } from './covers'
import { resolveLanguage, setLanguage } from '../shared/i18n'
import { DEFAULT_SETTINGS, JsonFile, applyNames, emptyStats, mergeSettings } from './store'

export const COVER_SCHEME = 'offli-img'

/** Shared main-process state: JSON files, resolved covers, window access */
export function createContext(data: string, getWin: () => BrowserWindow | null) {
  const settings = new JsonFile<Settings>(join(data, 'settings.json'), structuredClone(DEFAULT_SETTINGS), mergeSettings)
  const stats = new JsonFile<Record<string, GameStats>>(join(data, 'stats.json'), {})
  // library.json keeps detected names; user names are applied on read
  const library = new JsonFile<Game[]>(join(data, 'library.json'), [])
  const hashes = new JsonFile<HashCache>(join(data, 'hashes.json'), {})
  const covers = new CoverResolver(
    join(data, 'covers'),
    () => settings.data,
    async (path) => {
      const icon = await app.getFileIcon(path, { size: 'large' }).catch(() => null)
      // System icon too small (32 px on Windows): the name card looks better than a blurry image
      return icon && !icon.isEmpty() && icon.getSize().width >= 48 ? icon.toPNG() : null
    }
  )
  // Only paths resolved here can be served to the renderer
  const coverPaths = new Map<string, string>()
  // Grid card thumbnails (offli-img://thumb/<id>)
  const thumbPaths = new Map<string, string>()
  let coverVersion = 0

  // Language of main-process messages (launch errors, dialogs)
  const applyLanguage = (): void => setLanguage(resolveLanguage(settings.data.language, app.getLocale()))
  applyLanguage()

  const games = (): Game[] => applyNames(library.data, settings.data.nameOverrides)
  const statsOf = (id: string): GameStats => (stats.data[id] ??= emptyStats())

  return {
    data,
    settings,
    stats,
    library,
    hashes,
    covers,
    coverPaths,
    thumbPaths,
    getWin,
    applyLanguage,
    games,
    statsOf,
    /** Older fangame versions launch and resolve like regular games */
    findGame: (id: string): Game | undefined =>
      games()
        .flatMap((g) => g.versions ?? [g])
        .find((g) => g.id === id),
    pushStats: (): void => getWin()?.webContents.send('stats:changed', stats.data),
    /** The renderer gets a new URL */
    dropCovers(id?: string): void {
      covers.invalidate(id)
      for (const map of [coverPaths, thumbPaths]) {
        if (id) map.delete(id)
        else map.clear()
      }
      coverVersion++
    },
    coverUrl: (id: string, host: 'cover' | 'thumb' = 'cover'): string =>
      `${COVER_SCHEME}://${host}/${id}?v=${coverVersion}`,
    // The SteamGridDB key stays here: the renderer only knows it exists
    publicSettings: (): Settings => ({
      ...settings.data,
      steamGridDbKey: '',
      hasSteamGridDbKey: !!settings.data.steamGridDbKey
    })
  }
}

export type MainContext = ReturnType<typeof createContext>
