import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Game, GameStats, Settings } from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  libraryPaths: [],
  startView: 'library',
  bigPictureFullscreen: false,
  minimizeOnLaunch: true,
  tutorialDone: false,
  hiddenGames: [],
  theme: 'pokeball',
  language: 'auto',
  librarySort: 'name',
  emulators: {
    gb: { path: '' },
    gbc: { path: '' },
    gba: { path: '' },
    nds: { path: '' },
    '3ds': { path: '' }
  },
  winePath: 'wine',
  windowsRunner: 'wine',
  protonPath: '',
  bottlesBottle: '',
  bottlesFlatpak: false,
  launchExe: {},
  useSteamGridDb: false,
  steamGridDbKey: '',
  useBaseRomCovers: true,
  coverOverrides: {},
  nameOverrides: {}
}

/** Small JSON file written atomically (temp file, then rename) */
export class JsonFile<T> {
  data: T
  private writing = Promise.resolve()

  constructor(
    private path: string,
    fallback: T,
    merge: (fallback: T, loaded: unknown) => T = (_f, l) => l as T
  ) {
    let loaded: unknown
    try {
      loaded = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      loaded = undefined
    }
    this.data = loaded === undefined ? fallback : merge(fallback, loaded)
  }

  save(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2)
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.path), { recursive: true })
      const tmp = `${this.path}.tmp`
      await writeFile(tmp, snapshot, 'utf8')
      await rename(tmp, this.path)
    })
    return this.writing
  }

  /** Last write before quitting (async writes may not finish) */
  saveSync(): void {
    mkdirSync(dirname(this.path), { recursive: true })
    const tmp = `${this.path}.tmp`
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    renameSync(tmp, this.path)
  }
}

/** Keeps only each emulator path (the old args field is ignored) */
function mergeEmulators(fallback: Settings['emulators'], loaded: unknown): Settings['emulators'] {
  const out = { ...fallback }
  for (const key of Object.keys(out) as (keyof Settings['emulators'])[]) {
    const path = (loaded as Record<string, { path?: unknown }> | undefined)?.[key]?.path
    out[key] = { path: typeof path === 'string' ? path : '' }
  }
  return out
}

/** Keeps string values only */
function stringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === 'string'))
}

export function mergeSettings(fallback: Settings, loaded: unknown): Settings {
  // viewMode and libraryPath come from older settings files
  const { viewMode, libraryPath, ...l } = (loaded ?? {}) as Partial<Settings> & {
    viewMode?: unknown
    libraryPath?: unknown
  }
  const paths = Array.isArray(l.libraryPaths)
    ? l.libraryPaths
    : typeof libraryPath === 'string' && libraryPath
      ? [libraryPath]
      : fallback.libraryPaths
  return {
    ...fallback,
    ...l,
    libraryPaths: [...paths],
    startView:
      l.startView === 'library' || l.startView === 'bigpicture'
        ? l.startView
        : viewMode === 'bigpicture'
          ? 'bigpicture'
          : fallback.startView,
    bigPictureFullscreen:
      typeof l.bigPictureFullscreen === 'boolean' ? l.bigPictureFullscreen : fallback.bigPictureFullscreen,
    minimizeOnLaunch: typeof l.minimizeOnLaunch === 'boolean' ? l.minimizeOnLaunch : fallback.minimizeOnLaunch,
    tutorialDone: typeof l.tutorialDone === 'boolean' ? l.tutorialDone : fallback.tutorialDone,
    hiddenGames: Array.isArray(l.hiddenGames) ? l.hiddenGames.filter((id): id is string => typeof id === 'string') : [],
    theme: (['doux', 'console', 'electrique', 'pokeball', 'emeraude'] as const).includes(l.theme as Settings['theme'])
      ? (l.theme as Settings['theme'])
      : fallback.theme,
    librarySort: (['name', 'recent', 'playtime'] as const).includes(l.librarySort as Settings['librarySort'])
      ? (l.librarySort as Settings['librarySort'])
      : fallback.librarySort,
    language: (['auto', 'fr', 'en', 'es'] as const).includes(l.language as Settings['language'])
      ? (l.language as Settings['language'])
      : fallback.language,
    emulators: mergeEmulators(fallback.emulators, l.emulators),
    windowsRunner: (['wine', 'proton', 'bottles'] as const).includes(l.windowsRunner as Settings['windowsRunner'])
      ? (l.windowsRunner as Settings['windowsRunner'])
      : fallback.windowsRunner,
    protonPath: typeof l.protonPath === 'string' ? l.protonPath : fallback.protonPath,
    bottlesBottle: typeof l.bottlesBottle === 'string' ? l.bottlesBottle : fallback.bottlesBottle,
    bottlesFlatpak: typeof l.bottlesFlatpak === 'boolean' ? l.bottlesFlatpak : fallback.bottlesFlatpak,
    launchExe: stringRecord(l.launchExe),
    coverOverrides: { ...(l.coverOverrides ?? {}) },
    nameOverrides: { ...(l.nameOverrides ?? {}) }
  }
}

/** Applies user names, then sorts by shown name */
export function applyNames(games: Game[], overrides: Record<string, string>): Game[] {
  return games
    .map((g) => {
      const name = overrides[g.id]?.trim()
      return name && name !== g.name ? { ...g, name, originalName: g.name } : g
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}

export function emptyStats(): GameStats {
  return { playtimeSec: 0, favorite: false }
}
