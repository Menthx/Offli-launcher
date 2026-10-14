export type Platform = 'pc' | 'gb' | 'gbc' | 'gba' | 'nds' | '3ds'

/** baserom : ROM officielle non modifiée, rangée à part des jeux */
export type GameKind = 'fangame' | 'romhack' | 'baserom'

export interface BaseRom {
  /** Code ou titre lu dans l'en-tête de la ROM (ex. BPRE, PM_CRYSTAL) */
  code: string
  /** Nom lisible du jeu de base (ex. Rouge Feu) */
  name: string
}

export interface Game {
  /** Identifiant stable, dérivé du chemin relatif dans la bibliothèque */
  id: string
  name: string
  kind: GameKind
  platform: Platform
  /** Chemin absolu de Game.exe ou de la ROM */
  path: string
  /** Dossier du jeu (pour un fangame) ou dossier contenant la ROM */
  dir: string
  baseRom?: BaseRom
  /** Dossier de cette version, quand plusieurs versions du même fangame existent */
  variant?: string
  /** Toutes les versions du jeu, la plus récente en premier (celle-ci comprise) */
  versions?: Game[]
  /** Nom détecté au scan, présent seulement si l'utilisateur a renommé le jeu */
  originalName?: string
}

export interface GameStats {
  lastPlayed?: number
  playtimeSec: number
  favorite: boolean
}

export type EmulatorPlatform = Exclude<Platform, 'pc'>

export interface EmulatorConfig {
  /** Chemin de l'exécutable de l'émulateur */
  path: string
  /** Arguments, {rom} est remplacé par le chemin de la ROM */
  args: string[]
}

export interface Settings {
  libraryPath: string
  emulators: Record<EmulatorPlatform, EmulatorConfig>
  /** Commande utilisée pour lancer Game.exe hors Windows */
  winePath: string
  useSteamGridDb: boolean
  steamGridDbKey: string
  /** Utiliser la jaquette du jeu de base (libretro-thumbnails) pour les romhacks */
  useBaseRomCovers: boolean
  /** Image choisie par l'utilisateur, par id de jeu */
  coverOverrides: Record<string, string>
  /** Nom choisi par l'utilisateur, par id de jeu */
  nameOverrides: Record<string, string>
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

export interface OffliApi {
  getSettings(): Promise<Settings>
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  pickFolder(): Promise<string | null>
  pickFile(kind: 'image' | 'executable'): Promise<string | null>
  /** Index du dernier scan, disponible immédiatement au démarrage */
  getLibrary(): Promise<Game[]>
  /** Rescanne le dossier et met l'index à jour */
  scan(): Promise<Game[]>
  getStats(): Promise<Record<string, GameStats>>
  toggleFavorite(id: string): Promise<GameStats>
  resolveCover(id: string): Promise<string | null>
  setCover(id: string, path: string | null): Promise<string | null>
  /** Renomme un jeu (null rétablit le nom détecté) et renvoie la liste à jour */
  renameGame(id: string, name: string | null): Promise<Game[]>
  launch(id: string): Promise<LaunchResult>
  openFolder(id: string): Promise<void>
  onStatsChanged(cb: (stats: Record<string, GameStats>) => void): () => void
}
