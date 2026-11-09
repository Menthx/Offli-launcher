import type { Game } from '../../../../shared/types'

/** Above this, cards are not animated one by one (large libraries) */
export const MAX_ANIMATED_CARDS = 120

export interface CardHandlers {
  selectedId: string | undefined
  select(id: string | undefined): void
  launch(game: Game): void
}

/** Click toggles selection; double-click launches and keeps it selected */
export function cardActions(g: Game, h: CardHandlers): { click(e: MouseEvent): void; dblclick(): void } {
  return {
    click: (e) => {
      if (e.detail <= 1) h.select(g.id === h.selectedId ? undefined : g.id)
    },
    dblclick: () => {
      h.select(g.id)
      h.launch(g)
    }
  }
}
