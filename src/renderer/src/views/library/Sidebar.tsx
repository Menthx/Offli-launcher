import { forwardRef } from 'react'
import type { Game, GameStats } from '../../../../shared/types'
import logo from '../../assets/logo.png'
import { Icon } from '../../components/icons'
import { UpdateButton } from '../../components/UpdateButton'
import { t } from '../../../../shared/i18n'
import { FILTERS, type Filter, filterLabel, groupLabel, matches } from './filters'

interface Props {
  games: Game[]
  stats: Record<string, GameStats>
  filter: Filter
  onFilter(f: Filter): void
  query: string
  onQuery(q: string): void
  onSearchKey(e: React.KeyboardEvent): void
  onBigPicture(): void
  onOpenSettings(): void
}

export const Sidebar = forwardRef<HTMLInputElement, Props>(function Sidebar(p, searchRef) {
  return (
    <aside className="lib-side">
      <span className="brand" onClick={() => p.onFilter('all')}>
        <img className="brand-logo" src={logo} alt="" aria-hidden="true" draggable={false} />
        Offli-Launcher
      </span>
      <label className="searchbar" data-tour="sidebar" data-tooltip={t('library.searchTip')}>
        <Icon name="search" />
        <input
          id="lib-search"
          ref={searchRef}
          type="search"
          aria-label={t('library.searchLabel')}
          placeholder={t('library.searchPlaceholder')}
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          onKeyDown={p.onSearchKey}
        />
        <kbd aria-hidden="true">Ctrl K</kbd>
      </label>
      <nav className="side-filters" aria-label={t('library.filtersLabel')} data-tour="sidebar">
        {FILTERS.map((f) => (
          <div key={f.id} className="side-item">
            {f.group && <h4>{groupLabel(f.group)}</h4>}
            <button
              className={p.filter === f.id ? 'on' : ''}
              onClick={() => p.onFilter(f.id)}
              aria-pressed={p.filter === f.id}
            >
              <span>{filterLabel(f.id)}</span>
              <span className="count">{p.games.filter((g) => matches(f.id, g, p.stats[g.id])).length}</span>
            </button>
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <button
          className="icon-square"
          onClick={p.onBigPicture}
          aria-label={`${t('common.bigPicture')} (F11)`}
          data-tooltip={`${t('common.bigPicture')}|F11`}
        >
          <Icon name="monitor" size={20} />
        </button>
        <UpdateButton />
        <button
          className="settings-btn"
          data-tour="settings"
          onClick={p.onOpenSettings}
          aria-label={t('common.settings')}
          data-tooltip={t('common.settings')}
        >
          <Icon name="settings" size={20} />
        </button>
      </div>
    </aside>
  )
})
