import type { Game, Settings } from '../../../../shared/types'
import { t } from '../../../../shared/i18n'
import { THEMES, themeLabel } from '../../theme'
import type { TourStepId } from '../../tour'
import { FolderList } from '../FolderList'

interface Props {
  step: TourStepId
  settings: Settings
  games: Game[]
  scanning: boolean
  onSave(patch: Partial<Settings>): Promise<void>
}

/** Stylised Poké Ball */
export function TourLogo(): React.JSX.Element {
  return (
    <span className="tour-logo" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h6M15 12h6" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  )
}

export function TourBody({ step, settings, games, scanning, onSave }: Props): React.JSX.Element | null {
  switch (step) {
    case 'welcome':
      return <p>{t('tour.welcomeBody')}</p>
    case 'folders':
      return (
        <FolderList
          paths={settings.libraryPaths}
          onChange={(libraryPaths) => onSave({ libraryPaths })}
          games={games}
          scanning={scanning}
        />
      )
    case 'sidebar':
      return <p>{t('tour.sidebarBody')}</p>
    case 'detail':
      return <p>{t('tour.detailBody')}</p>
    case 'settings':
      return (
        <>
          <p>{t('tour.settingsBody')}</p>
          <div className="tour-themes" role="group" aria-label={t('settings.theme')}>
            {THEMES.map((th) => (
              <button
                key={th.id}
                className={`tour-chip ${settings.theme === th.id ? 'on' : ''}`}
                aria-pressed={settings.theme === th.id}
                onClick={() => onSave({ theme: th.id })}
              >
                <span className="swatches" aria-hidden="true">
                  {th.swatches.slice(0, 3).map((c) => (
                    <span key={c} className="swatch" style={{ background: c }} />
                  ))}
                </span>
                {themeLabel(th.id)}
              </button>
            ))}
          </div>
        </>
      )
    case 'bigpicture':
      return (
        <>
          <p>{t('tour.bigpictureBody')}</p>
          <dl className="tour-keys">
            <dt>
              <kbd>F11</kbd>
            </dt>
            <dd>{t('tour.keyOpenBp')}</dd>
            <dt>
              <kbd>{t('common.keyEsc')}</kbd> / <kbd>B</kbd>
            </dt>
            <dd>{t('tour.keyBack')}</dd>
            <dt>
              <kbd>A</kbd>
            </dt>
            <dd>{t('tour.keyLaunch')}</dd>
          </dl>
        </>
      )
    default:
      return null
  }
}
