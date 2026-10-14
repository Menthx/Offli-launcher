import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game, GameStats } from '../../../shared/types'
import type { ViewProps } from '../App'
import { Cover } from '../components/Cover'
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from '../format'

type Filter = 'all' | 'fav' | 'fangame' | 'gba' | 'nds' | 'gb' | '3ds' | 'new'

const FILTERS: { id: Filter; label: string; group?: string }[] = [
  { id: 'all', label: 'Tous les jeux', group: 'Bibliothèque' },
  { id: 'fav', label: 'Favoris' },
  { id: 'new', label: 'Jamais lancés' },
  { id: 'fangame', label: 'Fangames PC', group: 'Plateformes' },
  { id: 'gba', label: 'GBA' },
  { id: 'nds', label: 'NDS' },
  { id: 'gb', label: 'GB / GBC' },
  { id: '3ds', label: '3DS' }
]

function matches(f: Filter, g: Game, s: GameStats | undefined): boolean {
  switch (f) {
    case 'all':
      return true
    case 'fav':
      return !!s?.favorite
    case 'new':
      return !s?.lastPlayed
    case 'fangame':
      return g.kind === 'fangame'
    case 'gb':
      return g.platform === 'gb' || g.platform === 'gbc'
    default:
      return g.platform === f
  }
}

interface Props extends ViewProps {
  libraryPath: string
  scanning: boolean
  onRescan(): void
  onOpenSettings(): void
  onCoverChanged(id: string): void
}

export function LibraryView(p: Props): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
        search.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return p.games.filter((g) => matches(filter, g, p.stats[g.id]) && (!q || g.name.toLowerCase().includes(q)))
  }, [p.games, p.stats, filter, query])

  const recent = useMemo(
    () =>
      p.games
        .filter((g) => p.stats[g.id]?.lastPlayed)
        .sort((a, b) => (p.stats[b.id]!.lastPlayed ?? 0) - (p.stats[a.id]!.lastPlayed ?? 0))
        .slice(0, 8),
    [p.games, p.stats]
  )

  const sel = p.selected
  const selStats = sel ? p.stats[sel.id] : undefined

  const onSearchKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && visible[0]) p.onLaunch(visible[0])
    if (e.key === 'Escape') setQuery('')
  }

  return (
    <div className="lib">
      <header className="lib-top">
        <span className="brand">
          <span className="dot" aria-hidden="true" />
          Offli-Launcher
        </span>
        <label className="searchbar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l4 4" />
          </svg>
          <input
            id="lib-search"
            ref={search}
            type="search"
            placeholder="Rechercher un jeu… (Ctrl+K, Entrée pour lancer le premier)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
        </label>
        <button className="ghost" onClick={p.onRescan} disabled={p.scanning} title={p.libraryPath}>
          {p.scanning ? 'Scan…' : 'Rescanner'}
        </button>
        <button className="ghost" onClick={p.onOpenSettings}>
          Paramètres
        </button>
      </header>

      <aside className="lib-side">
        {FILTERS.map((f) => (
          <div key={f.id} className="side-item">
            {f.group && <h4>{f.group}</h4>}
            <button className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
              <span>{f.label}</span>
              <span className="count">{p.games.filter((g) => matches(f.id, g, p.stats[g.id])).length}</span>
            </button>
          </div>
        ))}
      </aside>

      <main className="lib-main">
        {recent.length > 0 && !query && filter === 'all' && (
          <section className="stack-s">
            <h5>Récemment joués</h5>
            <div className="recent">
              {recent.map((g) => (
                <button
                  key={g.id}
                  className={`card ${g.id === sel?.id ? 'sel' : ''}`}
                  onClick={() => p.onSelect(g.id)}
                  onDoubleClick={() => p.onLaunch(g)}
                  title={g.name}
                >
                  <Cover game={g} />
                </button>
              ))}
            </div>
          </section>
        )}
        <section className="stack-s">
          <h5>
            {FILTERS.find((f) => f.id === filter)!.label} · {visible.length}
          </h5>
          {visible.length === 0 ? (
            <p className="muted">
              {p.games.length === 0
                ? p.scanning
                  ? 'Scan du dossier en cours…'
                  : 'Aucun jeu trouvé dans ce dossier. Vérifie le chemin dans les paramètres.'
                : 'Aucun jeu ne correspond.'}
            </p>
          ) : (
            <div className="grid">
              {visible.map((g) => (
                <button
                  key={g.id}
                  className={`card ${g.id === sel?.id ? 'sel' : ''}`}
                  onClick={() => p.onSelect(g.id)}
                  onDoubleClick={() => p.onLaunch(g)}
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
          )}
        </section>
      </main>

      <aside className="lib-detail">
        {sel && (
          <>
            <Cover game={sel} wide />
            <h3>{sel.name}</h3>
            <button className="play" onClick={() => p.onLaunch(sel)}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 1.5v13l11-6.5z" fill="currentColor" />
              </svg>
              JOUER
            </button>
            <dl className="facts">
              <dt>Type</dt>
              <dd>
                {kindLabel(sel)} · {PLATFORM_LABEL[sel.platform]}
              </dd>
              {sel.kind === 'romhack' && (
                <>
                  <dt>Base</dt>
                  <dd>{sel.baseRom ? `${sel.baseRom.name} (${sel.baseRom.code})` : 'Non reconnue'}</dd>
                </>
              )}
              <dt>Fichier</dt>
              <dd>{sel.path}</dd>
              <dt>Dernière session</dt>
              <dd>{lastPlayed(selStats?.lastPlayed)}</dd>
              <dt>Temps de jeu</dt>
              <dd>{playtime(selStats?.playtimeSec ?? 0)}</dd>
            </dl>
            <div className="row-actions">
              <button className="ghost" onClick={() => p.onFavorite(sel)}>
                {selStats?.favorite ? '★ Favori' : '☆ Ajouter aux favoris'}
              </button>
              <button className="ghost" onClick={() => window.offli.openFolder(sel.id)}>
                Ouvrir le dossier
              </button>
              <button
                className="ghost"
                onClick={async () => {
                  const img = await window.offli.pickFile('image')
                  if (img) {
                    await window.offli.setCover(sel.id, img)
                    p.onCoverChanged(sel.id)
                  }
                }}
              >
                Changer l'image
              </button>
              <button
                className="ghost"
                onClick={async () => {
                  await window.offli.setCover(sel.id, null)
                  p.onCoverChanged(sel.id)
                }}
              >
                Image automatique
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
