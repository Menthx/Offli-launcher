import { useRef, useState } from 'react'
import { type TKey, t } from '../../../shared/i18n'
import type { Game, Settings } from '../../../shared/types'
import { hiddenGamesOf } from '../hiddenGames'
import { Icon } from './icons'
import { DisplayTab } from './settings/DisplayTab'
import { EmulatorsTab } from './settings/EmulatorsTab'
import { ImagesTab } from './settings/ImagesTab'
import { HiddenTab, LibraryTab } from './settings/LibraryTabs'

const TABS = [
  { id: 'library', label: 'settings.tabLibrary' },
  { id: 'display', label: 'settings.tabDisplay' },
  { id: 'emulators', label: 'settings.tabEmulators' },
  { id: 'images', label: 'settings.tabImages' },
  { id: 'hidden', label: 'settings.tabHidden' }
] as const satisfies readonly { id: string; label: TKey }[]
type Tab = (typeof TABS)[number]['id']

/** Last open tab, kept for the session */
let lastTab: Tab = 'library'

/** Key → next tab index (arrows, Home/End), -1 otherwise */
function nextTab(key: string, i: number): number {
  const n = TABS.length
  if (key === 'ArrowDown' || key === 'ArrowRight') return (i + 1) % n
  if (key === 'ArrowUp' || key === 'ArrowLeft') return (i + n - 1) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return -1
}

interface Props {
  settings: Settings
  /** Whole library, hidden games included (for the Hidden games tab) */
  games: Game[]
  onSave(patch: Partial<Settings>): Promise<void>
  scanning: boolean
  onScan(): unknown
  /** Backup imported: reload everything from the main process */
  onImported(): void
  onReset(): void
  /** Closes Settings and restarts the tutorial */
  onReplayTour(): void
  onClose(): void
}

/** Nav on the left (surface), content on the right (elevated) */
export function SettingsPanel(p: Props): React.JSX.Element {
  const [tab, setTabState] = useState<Tab>(lastTab)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const hiddenCount = hiddenGamesOf(p.games, p.settings.hiddenGames).length

  const setTab = (t: Tab, focus = false): void => {
    lastTab = t
    setTabState(t)
    if (focus) tabRefs.current[t]?.focus()
  }
  const onTabKey = (e: React.KeyboardEvent): void => {
    const next = nextTab(
      e.key,
      TABS.findIndex((t) => t.id === tab)
    )
    if (next < 0) return
    e.preventDefault()
    setTab(TABS[next].id, true)
  }
  const current = TABS.find((t) => t.id === tab)!
  const common = { settings: p.settings, onSave: p.onSave }

  return (
    <div
      className="modal-back"
      onClick={p.onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') p.onClose()
      }}
    >
      <div
        className="settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <nav
          className="settings__nav"
          role="tablist"
          aria-orientation="vertical"
          aria-label={t('settings.sections')}
          onKeyDown={onTabKey}
        >
          <h2 className="settings__title" id="settings-title">
            {t('common.settings')}
          </h2>
          {TABS.map((item) => (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el
              }}
              id={`tab-${item.id}`}
              role="tab"
              className="settings__tab"
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              autoFocus={tab === item.id}
            >
              {t(item.label)}
              {item.id === 'hidden' && hiddenCount > 0 && <span className="count">{hiddenCount}</span>}
            </button>
          ))}
        </nav>

        <div
          className="settings__panel"
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          tabIndex={0}
        >
          <h3 className="settings__panel-title">{t(current.label)}</h3>
          {tab === 'library' && (
            <LibraryTab
              {...common}
              games={p.games}
              scanning={p.scanning}
              onScan={p.onScan}
              onImported={p.onImported}
              onReset={p.onReset}
            />
          )}
          {tab === 'display' && <DisplayTab {...common} onReplayTour={p.onReplayTour} />}
          {tab === 'emulators' && <EmulatorsTab {...common} />}
          {tab === 'images' && <ImagesTab {...common} />}
          {tab === 'hidden' && <HiddenTab {...common} games={p.games} />}
        </div>

        <button
          className="icon-btn settings__close"
          onClick={p.onClose}
          aria-label={t('common.close')}
          data-tooltip={`${t('common.close')}|${t('common.keyEsc')}`}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  )
}
