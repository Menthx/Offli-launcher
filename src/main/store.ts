import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { GameStats, Settings } from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  libraryPath: '',
  emulators: {
    gb: { path: '', args: ['{rom}'] },
    gbc: { path: '', args: ['{rom}'] },
    gba: { path: '', args: ['{rom}'] },
    nds: { path: '', args: ['{rom}'] },
    '3ds': { path: '', args: ['{rom}'] }
  },
  winePath: 'wine',
  useSteamGridDb: false,
  steamGridDbKey: '',
  useBaseRomCovers: true,
  coverOverrides: {}
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

export function mergeSettings(fallback: Settings, loaded: unknown): Settings {
  // viewMode (mode Big Picture, retiré) peut encore traîner dans d'anciens fichiers
  const { viewMode: _legacy, ...l } = (loaded ?? {}) as Partial<Settings> & { viewMode?: unknown }
  return {
    ...fallback,
    ...l,
    emulators: { ...fallback.emulators, ...(l.emulators ?? {}) },
    coverOverrides: { ...(l.coverOverrides ?? {}) }
  }
}

export function emptyStats(): GameStats {
  return { playtimeSec: 0, favorite: false }
}
