import type { Game, GameStats } from '../../../../shared/types'
import { Cover } from '../../components/Cover'
import { t } from '../../../../shared/i18n'
import { kindLabel, playtime } from '../../format'

/** Above this, cards are not animated one by one (large libraries) */
export const MAX_ANIMATED_CARDS = 120

export interface CardHandlers {
  selectedId: string | undefined
  onSelect(id: string | undefined): void
  onLaunch(game: Game): void
}

export interface GridProps extends CardHandlers {
  games: Game[]
  /** Transition name prefix: a game can appear in two sections */
  section: string
  animated: boolean
  stats: Record<string, GameStats>
}

/** Click toggles selection; double-click launches and keeps it selected */
export function cardActions(
  g: Game,
  p: CardHandlers
): Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onDoubleClick'> {
  return {
    onClick: (e) => {
      if (e.detail <= 1) p.onSelect(g.id === p.selectedId ? undefined : g.id)
    },
    onDoubleClick: () => {
      p.onSelect(g.id)
      p.onLaunch(g)
    }
  }
}

export function GameGrid(p: GridProps): React.JSX.Element {
  return (
    <div className="grid">
      {p.games.map((g, i) => (
        <button
          key={g.id}
          className={`card ${g.id === p.selectedId ? 'sel' : ''}`}
          data-game={g.id}
          data-tour={i === 0 ? 'game-card' : undefined}
          style={
            p.animated
              ? ({
                  viewTransitionName: `card-${p.section}-${g.id}`
                } as React.CSSProperties)
              : undefined
          }
          {...cardActions(g, p)}
        >
          <Cover game={g} />
          <span className="card-title">{g.name}</span>
          <span className="card-meta">
            <span>{kindLabel(g)}</span>
            <span>{playtime(p.stats[g.id]?.playtimeSec ?? 0)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

/** Covers only, no titles */
export function RecentRow({ games, ...h }: CardHandlers & { games: Game[] }): React.JSX.Element {
  return (
    <section className="stack-s">
      <h5>{t('library.recent')}</h5>
      <div className="recent">
        {games.map((g) => (
          <button
            key={g.id}
            className={`card ${g.id === h.selectedId ? 'sel' : ''}`}
            {...cardActions(g, h)}
            data-tooltip={g.name}
          >
            <Cover game={g} />
          </button>
        ))}
      </div>
    </section>
  )
}
