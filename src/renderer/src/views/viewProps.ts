import type { Game, GameStats, LibrarySort } from '../../../shared/types'

/** Shared by the library and Big Picture */
export interface ViewProps {
  games: Game[]
  stats: Record<string, GameStats>
  selected: Game | undefined
  /** Running games: id → launch time */
  running: Record<string, number>
  sort: LibrarySort
}

/** What both views can ask the app to do */
export type ViewEmits = {
  select: [id: string | undefined]
  launch: [game: Game]
  favorite: [game: Game]
  sort: [sort: LibrarySort]
}
