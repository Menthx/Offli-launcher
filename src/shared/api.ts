import type {
  CoverSize,
  DataResult,
  DetectedLink,
  DetectedRunners,
  Game,
  GameJournal,
  GameStats,
  LaunchResult,
  Settings,
  SgdbImage,
  SgdbResult,
  UpdateStatus
} from './types'

/** What the preload script exposes as window.offli */
export interface OffliApi {
  getSettings(): Promise<Settings>
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  pickFolder(): Promise<string | null>
  pickFile(kind: 'image' | 'executable'): Promise<string | null>
  /** Last scan index, available right away at startup */
  getLibrary(): Promise<Game[]>
  scan(): Promise<Game[]>
  getStats(): Promise<Record<string, GameStats>>
  toggleFavorite(id: string): Promise<GameStats>
  /** Status and collections; returns the updated stats */
  updateGame(id: string, patch: Pick<GameStats, 'status' | 'tags'>): Promise<GameStats>
  /** Wine, Proton and Bottles found on this computer */
  detectRunners(): Promise<DetectedRunners>
  /** Desktop shortcut that launches the game through Offli */
  createShortcut(id: string): Promise<{ ok: boolean; error?: string }>
  /** Messages from the main process (launch from a shortcut, errors) */
  onNotify(cb: (n: { text: string; error?: boolean }) => void): () => void
  /** 'thumb' for grid cards, 'full' for the game sheet and Big Picture */
  resolveCover(id: string, size?: CoverSize): Promise<string | null>
  setCover(id: string, path: string | null): Promise<string | null>
  /** null restores the detected name; returns the updated list */
  renameGame(id: string, name: string | null): Promise<Game[]>
  launch(id: string): Promise<LaunchResult>
  /** Running games: id → launch time (ms) */
  getRunning(): Promise<Record<string, number>>
  onRunning(cb: (running: Record<string, number>) => void): () => void
  /** Backup: write / read a JSON file picked by the user */
  exportData(): Promise<DataResult | null>
  importData(): Promise<DataResult | null>
  /** Puts every setting back to its default (stats are kept) */
  resetSettings(): Promise<boolean>
  openFolder(id: string): Promise<void>
  setFullScreen(on: boolean): Promise<void>
  /** F11: toggles Library / Big Picture */
  onToggleView(cb: () => void): () => void
  updateState(): Promise<{ status: UpdateStatus; version: string }>
  updateCheck(): Promise<void>
  updateDownload(): Promise<void>
  /** Only ever called after a click */
  updateInstall(): Promise<void>
  updateOpenPage(): Promise<void>
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void
  sgdbSearch(term: string): Promise<SgdbResult<{ id: number; name: string; year?: number }[]>>
  sgdbGrids(gameId: number, page: number): Promise<SgdbResult<{ images: SgdbImage[]; hasMore: boolean }>>
  /** Downloads the picked image and saves it as the game cover */
  sgdbPick(id: string, imageId: number): Promise<SgdbResult<null>>
  onStatsChanged(cb: (stats: Record<string, GameStats>) => void): () => void
  getJournal(id: string): Promise<GameJournal>
  /** Replaces the game's journal; returns it cleaned */
  saveJournal(id: string, journal: GameJournal): Promise<GameJournal>
  /** Discord and wiki links found in the game's text files */
  detectLinks(id: string): Promise<DetectedLink[]>
  /** http(s) only, in the default browser (or the Discord app) */
  openLink(url: string): Promise<void>
}
