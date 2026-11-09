import { onBeforeUnmount, shallowRef } from 'vue'
import type { Game, GameStats, Settings } from '../../../shared/types'
import { forgetCover } from './useCover'

/**
 * Renderer-side data (settings, library, stats, running games) and the actions that change it.
 * Shallow refs keep plain objects: they go back to the main process as they are (no Vue proxy).
 */
export function useLibraryData() {
  const settings = shallowRef<Settings | null>(null)
  const games = shallowRef<Game[]>([])
  const stats = shallowRef<Record<string, GameStats>>({})
  const running = shallowRef<Record<string, number>>({})
  const scanning = shallowRef(false)

  const rescan = async (): Promise<void> => {
    scanning.value = true
    try {
      const list = await window.offli.scan()
      forgetCover()
      games.value = list
    } finally {
      scanning.value = false
    }
  }

  /** Reloads everything (startup, after an import) */
  const load = async (): Promise<Settings> => {
    const [s, cached, st, run] = await Promise.all([
      window.offli.getSettings(),
      window.offli.getLibrary(),
      window.offli.getStats(),
      window.offli.getRunning()
    ])
    forgetCover()
    settings.value = s
    games.value = cached
    stats.value = st
    running.value = run
    return s
  }

  const offStats = window.offli.onStatsChanged((s) => (stats.value = { ...s }))
  const offRunning = window.offli.onRunning((r) => (running.value = { ...r }))
  onBeforeUnmount(() => {
    offStats()
    offRunning()
  })

  const save = async (patch: Partial<Settings>): Promise<void> => {
    settings.value = await window.offli.saveSettings(patch)
    if ('useSteamGridDb' in patch || 'steamGridDbKey' in patch || 'useBaseRomCovers' in patch) forgetCover()
    if ('libraryPaths' in patch) void rescan()
  }

  const rename = async (game: Game, name: string | null): Promise<void> => {
    games.value = await window.offli.renameGame(game.id, name)
    if (settings.value?.useSteamGridDb) forgetCover(game.id)
  }

  // Re-read coverOverrides and drop the old cover
  const coverChanged = async (id: string): Promise<void> => {
    forgetCover(id)
    settings.value = await window.offli.getSettings()
  }

  const favorite = async (game: Game): Promise<void> => {
    const s = await window.offli.toggleFavorite(game.id)
    stats.value = { ...stats.value, [game.id]: s }
  }

  return { settings, games, stats, running, scanning, rescan, load, save, rename, coverChanged, favorite }
}
