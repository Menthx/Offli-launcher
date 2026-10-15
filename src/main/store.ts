import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Game, GameStats, Settings } from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  libraryPaths: [],
  startView: 'library',
  emulators: {
    gb: { path: '' },
    gbc: { path: '' },
    gba: { path: '' },
    nds: { path: '' },
    '3ds': { path: '' }
  },
  winePath: 'wine',
  useSteamGridDb: false,
  steamGridDbKey: '',
  useBaseRomCovers: true,
  coverOverrides: {},
  nameOverrides: {}
}

/** Petit fichier JSON écrit de façon atomique (fichier temporaire puis renommage) */
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
}

/** Garde seulement le chemin de chaque émulateur (l'ancien champ args est ignoré) */
function mergeEmulators(fallback: Settings['emulators'], loaded: unknown): Settings['emulators'] {
  const out = { ...fallback }
  for (const key of Object.keys(out) as (keyof Settings['emulators'])[]) {
    const path = (loaded as Record<string, { path?: unknown }> | undefined)?.[key]?.path
    out[key] = { path: typeof path === 'string' ? path : '' }
  }
  return out
}

export function mergeSettings(fallback: Settings, loaded: unknown): Settings {
  // viewMode (ancien nom de startView) et libraryPath (un seul dossier, devenu libraryPaths)
  // viennent d'anciens fichiers de réglages
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
    emulators: mergeEmulators(fallback.emulators, l.emulators),
    coverOverrides: { ...(l.coverOverrides ?? {}) },
    nameOverrides: { ...(l.nameOverrides ?? {}) }
  }
}

/** Applique les noms choisis par l'utilisateur, puis trie par nom affiché */
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
