import type { Game } from '../../../shared/types'
import logo from '../assets/logo.png'
import { t } from '../../../shared/i18n'
import { FolderList } from './FolderList'

interface Props {
  paths: string[]
  onChange(paths: string[]): void
  games: Game[]
  scanning: boolean
}

/** First launch without a folder */
export function Onboarding(p: Props): React.JSX.Element {
  return (
    <div className="onboarding">
      <img className="onboarding-logo" src={logo} alt="" aria-hidden="true" draggable={false} />
      <h1>Offli-Launcher</h1>
      <p>{t('onboarding.choose')}</p>
      <p>{t('onboarding.sorts')}</p>
      <div className="onboarding-folders surface-card">
        <FolderList paths={p.paths} onChange={p.onChange} games={p.games} scanning={p.scanning} />
      </div>
    </div>
  )
}
