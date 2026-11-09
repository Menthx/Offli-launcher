import type { LanguagePref } from './i18n'

export type Platform = 'pc' | 'gb' | 'gbc' | 'gba' | 'nds' | '3ds'

/** baserom: unmodified official ROM, listed apart from the games */
export type GameKind = 'fangame' | 'romhack' | 'baserom'

export interface BaseRom {
  /** Code or title read from the ROM header (e.g. BPRE, PM_CRYSTAL) */
  code: string
  name: string
}

export interface Game {
  /** Stable id derived from the path relative to the library folder */
  id: string
  name: string
  kind: GameKind
  platform: Platform
  /** Absolute path to Game.exe or the ROM */
  path: string
  /** Game folder (fangame) or folder holding the ROM */
  dir: string
  baseRom?: BaseRom
  /** Folder name of this version when a fangame has several */
  variant?: string
  /** All versions, newest first (this one included) */
  versions?: Game[]
  /** Other ways to start a fangame: performance build, online updater */
  alternates?: GameExe[]
  /** Detected name, only set when the user renamed the game */
  originalName?: string
}

/** Where the player is in the game, set by hand */
export type GameStatus = 'todo' | 'playing' | 'done' | 'dropped'

export interface GameExe {
  /** Absolute path */
  path: string
  kind: 'performance' | 'launcher'
}

export interface GameStats {
  lastPlayed?: number
  playtimeSec: number
  favorite: boolean
  status?: GameStatus
  /** Player collections (Nuzlocke, Avec des amis…) */
  tags?: string[]
}

export interface JournalNote {
  id: string
  /** Written (or last edited) at, ms */
  at: number
  text: string
}

export interface GameLink {
  url: string
  /** Shown instead of the default label (Discord server, Wiki…) */
  label?: string
  /** Icon name (see LINK_ICONS) or image data URL, from offli.md */
  icon?: string
}

/** Player notes and community links, by game id (shared by all versions) */
export interface GameJournal {
  notes: JournalNote[]
  links: GameLink[]
  /** Detected links the player removed */
  hiddenLinks: string[]
}

/** Link found in a text file of the game folder */
export interface DetectedLink {
  url: string
  /** Name given in offli.md or by a .url shortcut */
  label?: string
  /** Icon picked in offli.md: icon name or image data URL */
  icon?: string
  /** File name it was found in */
  file: string
}

export type LinkKind = 'server' | 'channel' | 'wiki' | 'site'

export type Theme = 'doux' | 'console' | 'electrique' | 'pokeball' | 'emeraude'

export type StartView = 'library' | 'bigpicture'

export type EmulatorPlatform = Exclude<Platform, 'pc'>

export interface EmulatorConfig {
  path: string
}

export type WindowsRunner = 'wine' | 'proton' | 'bottles'

/** Found on this computer (Linux only) */
export interface DetectedRunners {
  wine: boolean
  protons: { name: string; path: string }[]
  bottles: boolean
  bottlesFlatpak: boolean
}

export type LibrarySort = 'name' | 'recent' | 'playtime'

export interface Settings {
  libraryPaths: string[]
  startView: StartView
  /** Switch the window to full screen when entering Big Picture */
  bigPictureFullscreen: boolean
  /** Minimize Offli while a game runs, bring it back when the game closes */
  minimizeOnLaunch: boolean
  /** First-launch tutorial finished or skipped */
  tutorialDone: boolean
  /** Hidden games by stable id (kept across scans) */
  hiddenGames: string[]
  theme: Theme
  librarySort: LibrarySort
  /** Interface language, or 'auto' to follow the system */
  language: LanguagePref
  emulators: Record<EmulatorPlatform, EmulatorConfig>
  /** Command used to run Game.exe outside Windows */
  winePath: string
  /** What runs Windows fangames on Linux and macOS */
  windowsRunner: WindowsRunner
  /** Proton script picked among the detected ones (…/Proton 9.0/proton) */
  protonPath: string
  /** Bottles bottle the fangames run in */
  bottlesBottle: string
  /** Bottles installed from Flathub (bottles-cli runs through flatpak) */
  bottlesFlatpak: boolean
  /** Executable picked per game id (performance build, launcher); absent = the detected one */
  launchExe: Record<string, string>
  useSteamGridDb: boolean
  steamGridDbKey: string
  /** Renderer only: a key is saved (the key itself never leaves the main process) */
  hasSteamGridDbKey?: boolean
  /** Use the base game cover (libretro-thumbnails) for romhacks */
  useBaseRomCovers: boolean
  /** Cover picked by the user, by game id */
  coverOverrides: Record<string, string>
  /** Name picked by the user, by game id */
  nameOverrides: Record<string, string>
}

export type SgdbResult<T> = { ok: true; value: T } | { ok: false; error: 'unauthorized' | 'network' }

export interface SgdbImage {
  id: number
  /** offli-img:// URL of the thumbnail downloaded by the main process */
  thumb: string
  width: number
  height: number
}

/** Update state sent by the main process; 'unsupported' + version means: install from the GitHub page */
export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  /** Translated by the renderer */
  | { state: 'error'; code: 'network' | 'no-release' | 'unknown' }
  | { state: 'unsupported'; reason: 'dev' | 'portable' | 'deb' | 'mac'; version?: string }

export type CoverSize = 'thumb' | 'full'

/** null when the user cancels the file dialog */
export type DataResult = { ok: true } | { ok: false; error?: 'invalid' | 'io' }

export interface LaunchResult {
  ok: boolean
  error?: string
}

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
