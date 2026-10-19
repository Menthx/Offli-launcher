import { useMemo, useRef, useState } from 'react'
import { t } from '../../../shared/i18n'
import type { ViewProps } from '../App'
import { Cover, useCover } from '../components/Cover'
import { Icon } from '../components/icons'
import { useNow } from '../hooks/useNow'
import { PLATFORM_LABEL, baseGameName, kindLabel, lastPlayed, playtime } from '../format'
import { Backdrop } from './bigpicture/Backdrop'
import { type BpSection, BpTabs } from './bigpicture/BpTabs'
import { SECTIONS, SORTS, type Filter, matches, sortGames } from './library/filters'
import { useBigPictureInput } from './bigpicture/useBigPictureInput'

interface Props extends ViewProps {
  /** Esc or B */
  onExit(): void
}

/** Keyboard / gamepad view: the current game stays in place, the rail slides under it */
export function BigPictureView(p: Props): React.JSX.Element {
  // Non-empty sections; base ROMs are not library games
  const [section, setSection] = useState<Filter>('all')
  const stats = useRef(p.stats)
  stats.current = p.stats
  const sections: BpSection[] = useMemo(
    () =>
      [
        { filter: 'all' as Filter, label: t('library.all') },
        ...SECTIONS.map((s) => ({ filter: s.filter, label: s.label() }))
      ]
        .map((s) => ({
          ...s,
          count: p.games.filter((g) => matches(s.filter, g, p.stats[g.id])).length
        }))
        .filter((s) => s.count > 0),
    [p.games, p.stats]
  )
  // Order is frozen while browsing (launching changes stats); recomputed on list, section or sort change
  const order = useMemo(
    () =>
      sortGames(
        p.games.filter((g) => matches(section, g, stats.current[g.id])),
        stats.current,
        p.sort
      ),
    [p.games, section, p.sort]
  )
  const [rawIdx, setIdx] = useState(0)
  const idx = Math.min(rawIdx, Math.max(0, order.length - 1))
  const cur = order[idx]
  const url = useCover(cur?.id ?? '')
  const now = useNow(!!cur && p.running[cur.id] !== undefined)

  const pickSection = (f: Filter): void => {
    setSection(f)
    setIdx(0)
  }
  useBigPictureInput({
    move: (d) => setIdx((i) => Math.max(0, Math.min(order.length - 1, i + d))),
    section: (d) => {
      const i = sections.findIndex((s) => s.filter === section)
      const next = sections[(i + d + sections.length) % sections.length]
      if (next) pickSection(next.filter)
    },
    sort: () => p.onSort(SORTS[(SORTS.findIndex((s) => s.id === p.sort) + 1) % SORTS.length].id),
    launch: () => cur && !p.running[cur.id] && p.onLaunch(cur),
    favorite: () => cur && p.onFavorite(cur),
    exit: p.onExit
  })

  if (!cur) {
    return (
      <div className="bp bp--empty">
        <div className="empty">
          <h4>{t('bp.empty')}</h4>
          <p>{t('bp.emptyHint')}</p>
          <button className="ghost" onClick={p.onExit} autoFocus>
            {t('bp.backToLibrary')}
          </button>
        </div>
      </div>
    )
  }

  const st = p.stats[cur.id]
  const since = p.running[cur.id]
  const fav = !!st?.favorite
  return (
    <div className="bp">
      <Backdrop id={cur.id} url={url} />

      <header className="bp-top">
        <button className="ghost bp-glass" onClick={p.onExit}>
          {t('bp.back')}
        </button>
        <BpTabs sections={sections} current={section} onPick={pickSection} />
        <span className="bp-count" aria-hidden="true">
          {t(SORTS.find((x) => x.id === p.sort)!.label)} · {idx + 1} / {order.length}
        </span>
      </header>

      <section className="bp-hero" aria-live="polite" key={cur.id}>
        <p className="bp-eyebrow">
          <span className={`badge ${cur.kind === 'fangame' ? 'fan' : 'rom'}`}>{PLATFORM_LABEL[cur.platform]}</span>
          <span>{kindLabel(cur)}</span>
          {cur.baseRom && <span>{t('bp.baseOf', { name: baseGameName(cur.baseRom) })}</span>}
          {cur.versions && <span>{t('bp.versions', { n: cur.versions.length })}</span>}
        </p>
        <h2>{cur.name}</h2>
        <p className="bp-meta">
          {t('bp.meta', {
            time: playtime(st?.playtimeSec ?? 0),
            last: lastPlayed(st?.lastPlayed)
          })}
        </p>
        <div className="bp-actions">
          <button className="play bp-play" onClick={() => p.onLaunch(cur)} disabled={since !== undefined}>
            <span className="play-icon">
              {since !== undefined ? <span className="run-dot" aria-hidden="true" /> : <Icon name="play" size={18} />}
            </span>
            <span className="play-label">
              {since !== undefined
                ? t('common.running', {
                    time: playtime(Math.round((now - since) / 1000))
                  })
                : t('common.play')}
            </span>
          </button>
          <button
            className={`bp-glass bp-fav ${fav ? 'on' : ''}`}
            onClick={() => p.onFavorite(cur)}
            aria-pressed={fav}
            aria-label={fav ? t('common.favRemove') : t('common.favAdd')}
          >
            <Icon name="star" size={20} />
          </button>
        </div>
      </section>

      <div className="bp-rail" role="listbox" aria-label={t('bp.games')} aria-activedescendant={`bp-${cur.id}`}>
        <div className="bp-track" style={{ '--bp-index': idx } as React.CSSProperties}>
          {order.map((g, i) => (
            <button
              key={g.id}
              id={`bp-${g.id}`}
              role="option"
              aria-selected={i === idx}
              aria-label={g.name}
              className={`tile ${i === idx ? 'cur' : ''} ${i < idx ? 'past' : ''}`}
              tabIndex={-1}
              onClick={() => (i === idx ? p.onLaunch(g) : setIdx(i))}
            >
              <Cover game={g} />
            </button>
          ))}
        </div>
      </div>

      <footer className="bp-foot">
        <span>
          <span className="pad a">A</span>
          {t('common.play')}
        </span>
        <span>
          <span className="pad x">X</span>
          {t('bp.favorite')}
        </span>
        <span>
          <span className="pad y">Y</span>
          {t('bp.sortHint')}
        </span>
        <span>
          <span className="pad b">B</span>
          {t('common.library')}
        </span>
        <span className="bp-keys">
          <kbd>←</kbd> <kbd>→</kbd> <kbd>Q</kbd> <kbd>E</kbd> <kbd>S</kbd> <kbd>{t('common.keyEnter')}</kbd>{' '}
          <kbd>F</kbd> <kbd>{t('common.keyEsc')}</kbd>
        </span>
      </footer>
    </div>
  )
}
