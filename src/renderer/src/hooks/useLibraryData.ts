import { useCallback, useEffect, useState } from 'react'
import type { Game, GameStats, Settings } from '../../../shared/types'
import { forgetCover } from '../components/Cover'

/** Renderer-side data (settings, library, stats, running games) and the actions that change it */
export function useLibraryData() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [stats, setStats] = useState<Record<string, GameStats>>({})
  const [running, setRunning] = useState<Record<string, number>>({})
  const [scanning, setScanning] = useState(false)

  const rescan = useCallback(async () => {
    setScanning(true)
    try {
      const list = await window.offli.scan()
      forgetCover()
      setGames(list)
    } finally {
      setScanning(false)
    }
  }, [])

  /** Reloads everything (startup, after an import) */
  const load = useCallback(async () => {
    const [s, cached, st, run] = await Promise.all([
      window.offli.getSettings(),
      window.offli.getLibrary(),
      window.offli.getStats(),
      window.offli.getRunning()
    ])
    forgetCover()
    setSettings(s)
    setGames(cached)
    setStats(st)
    setRunning(run)
    return s
  }, [])

  useEffect(() => {
    const offStats = window.offli.onStatsChanged((s) => setStats({ ...s }))
    const offRunning = window.offli.onRunning((r) => setRunning({ ...r }))
    return () => {
      offStats()
      offRunning()
    }
  }, [])

  const save = async (patch: Partial<Settings>): Promise<void> => {
    setSettings(await window.offli.saveSettings(patch))
    if ('useSteamGridDb' in patch || 'steamGridDbKey' in patch || 'useBaseRomCovers' in patch) forgetCover()
    if ('libraryPaths' in patch) void rescan()
  }

  const rename = async (game: Game, name: string | null): Promise<void> => {
    setGames(await window.offli.renameGame(game.id, name))
    if (settings?.useSteamGridDb) forgetCover(game.id)
  }

  // Re-read coverOverrides and drop the old cover
  const coverChanged = async (id: string): Promise<void> => {
    forgetCover(id)
    setSettings(await window.offli.getSettings())
  }

  const favorite = async (game: Game): Promise<void> => {
    const s = await window.offli.toggleFavorite(game.id)
    setStats((prev) => ({ ...prev, [game.id]: s }))
  }

  return {
    settings,
    games,
    stats,
    running,
    scanning,
    rescan,
    load,
    save,
    rename,
    coverChanged,
    favorite
  }
}
