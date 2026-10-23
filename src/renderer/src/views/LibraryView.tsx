import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../../shared/i18n'
import type { Game } from '../../../shared/types'
import type { ViewProps } from '../App'
import { Icon } from '../components/icons'
import { Select } from '../components/Select'
import { SgdbPicker } from '../components/SgdbPicker'
import { animate } from '../viewTransition'
import {
  SECTIONS,
  SORTS,
  type Filter,
  filterGames,
  sortGames,
  filterLabel,
  firstShown,
  matches,
  recentGames
} from './library/filters'
import { GameDetail } from './library/GameDetail'
import { GameGrid, MAX_ANIMATED_CARDS, RecentRow } from './library/GameGrid'
import { Sidebar } from './library/Sidebar'
import { useLibraryKeys } from './library/useLibraryKeys'

/** Debounce so fast typing triggers a single animation */
const SEARCH_SETTLE_MS = 120

interface Props extends ViewProps {
  scanning: boolean
  onOpenSettings(): void
  onBigPicture(): void
  customCovers: Record<string, string>
  /** Lets the menu offer picking a cover */
  hasSgdbKey: boolean
  onCoverChanged(id: string): void
  onRename(game: Game, name: string | null): void
  /** Hides the game everywhere (closes its sheet if open) */
  onHide(game: Game): void
}

export function LibraryView(p: Props): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  // Query applied to the grid once typing settles
  const [appliedQuery, setAppliedQuery] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [sgdbFor, setSgdbFor] = useState<Game>()
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query === appliedQuery) return
    const t = window.setTimeout(() => animate(() => setAppliedQuery(query)), SEARCH_SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [query, appliedQuery])

  const visible = useMemo(
    () => sortGames(filterGames(p.games, p.stats, filter, appliedQuery), p.stats, p.sort),
    [p.games, p.stats, filter, appliedQuery, p.sort]
  )
  const recent = useMemo(() => recentGames(p.games, p.stats), [p.games, p.stats])
  const sel = p.selected
  // Picked version (newest by default) is what Enter launches
  const target = sel && (sel.versions?.find((v) => v.id === picked[sel.id]) ?? sel)
  useLibraryKeys(search, target && !p.running[target.id] ? () => p.onLaunch(target) : undefined)

  // Back from the game page lands where the grid was left
  const main = useRef<HTMLElement>(null)
  const gridScroll = useRef(0)
  // From the game page, the logo, a filter or the search show the grid again, from the top
  const backToGrid = (update: () => void): void => {
    update()
    if (!sel) return
    gridScroll.current = 0
    p.onSelect(undefined)
  }
  const changeFilter = (f: Filter): void => (sel ? backToGrid(() => setFilter(f)) : animate(() => setFilter(f)))
  useLayoutEffect(() => {
    if (main.current) main.current.scrollTop = sel ? 0 : gridScroll.current
  }, [sel?.id])

  const gridProps = {
    animated: visible.length <= MAX_ANIMATED_CARDS,
    stats: p.stats,
    selectedId: sel?.id,
    onSelect: p.onSelect,
    onLaunch: p.onLaunch
  }

  const onSearchKey = (e: React.KeyboardEvent): void => {
    // Enter right after typing: launch the first match without waiting
    if (e.key === 'Enter' && query !== appliedQuery) {
      const hit = sortGames(filterGames(p.games, p.stats, filter, query), p.stats, p.sort)[0]
      setAppliedQuery(query)
      if (hit) p.onLaunch(hit)
      return
    }
    const first = firstShown(visible, p.stats, filter)
    if (e.key === 'Enter' && first) p.onLaunch(first)
    if (e.key === 'Escape') setQuery('')
  }

  const emptyText =
    p.games.length > 0 ? t('library.emptyNoMatch') : p.scanning ? t('library.emptyScanning') : t('library.emptyNone')

  return (
    <div className="lib">
      <Sidebar
        ref={search}
        games={p.games}
        stats={p.stats}
        filter={filter}
        onFilter={changeFilter}
        query={query}
        onQuery={(q) => backToGrid(() => setQuery(q))}
        onSearchKey={onSearchKey}
        onBigPicture={p.onBigPicture}
        onOpenSettings={p.onOpenSettings}
      />

      <main
        className="lib-main"
        ref={main}
        onScroll={(e) => {
          if (!sel) gridScroll.current = e.currentTarget.scrollTop
        }}
      >
        {sel ? (
          <GameDetail
            game={sel}
            stats={p.stats[sel.id]}
            hasCustomCover={!!p.customCovers[sel.id]}
            hasSgdbKey={p.hasSgdbKey}
            picked={picked}
            runningSince={p.running}
            onPick={(gameId, versionId) => setPicked({ ...picked, [gameId]: versionId })}
            onClose={() => p.onSelect(undefined)}
            onLaunch={p.onLaunch}
            onFavorite={p.onFavorite}
            onRename={p.onRename}
            onCoverChanged={p.onCoverChanged}
            onPickSgdb={setSgdbFor}
            onHide={p.onHide}
          />
        ) : (
          <>
            <div className="lib-toolbar">
              <label htmlFor="lib-sort" className="lib-toolbar__label">
                <Icon name="sort" size={14} />
                {t('library.sort')}
              </label>
              <Select
                id="lib-sort"
                className="select--sm lib-sort"
                value={p.sort}
                onChange={(sort) => animate(() => p.onSort(sort))}
                options={SORTS.map((s) => ({ value: s.id, label: t(s.label) }))}
              />
            </div>
            {recent.length > 0 && !query && filter === 'all' && <RecentRow {...gridProps} games={recent} />}
            {visible.length === 0 ? (
              <section className="stack-s">
                <h5>{filterLabel(filter)} · 0</h5>
                <p className="muted">{emptyText}</p>
              </section>
            ) : filter === 'all' ? (
              SECTIONS.map((sec) => {
                const games = visible.filter((g) => matches(sec.filter, g, p.stats[g.id]))
                if (games.length === 0) return null
                return (
                  <section key={sec.filter} className="stack-s">
                    <h5>
                      <button
                        className="section-link"
                        onClick={() => changeFilter(sec.filter)}
                        data-tooltip={t('library.onlyThis', { label: sec.label() })}
                      >
                        {sec.label()}
                      </button>{' '}
                      · {games.length}
                    </h5>
                    <GameGrid {...gridProps} section={sec.filter} games={games} />
                  </section>
                )
              })
            ) : (
              <section className="stack-s">
                <h5>
                  {filterLabel(filter)} · {visible.length}
                </h5>
                <GameGrid {...gridProps} section={filter} games={visible} />
              </section>
            )}
          </>
        )}
      </main>

      {sgdbFor && (
        <SgdbPicker
          game={sgdbFor}
          onClose={() => setSgdbFor(undefined)}
          onPicked={() => p.onCoverChanged(sgdbFor.id)}
        />
      )}
    </div>
  )
}
