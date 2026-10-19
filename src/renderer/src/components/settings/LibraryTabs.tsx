import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game, Settings } from '../../../../shared/types'
import { PLATFORM_LABEL, kindLabel } from '../../format'
import { hiddenGamesOf, showGame, withoutHidden } from '../../hiddenGames'
import { withMinDuration } from '../../minDuration'
import { Cover } from '../Cover'
import { FolderList } from '../FolderList'
import { BackupGroup } from './BackupGroup'
import { ResetGroup } from './ResetGroup'
import { Group, Row } from './controls'

/** Minimum 'Scanning…' time so a fast scan stays visible */
const SCAN_FEEDBACK_MS = 2000

interface Props {
  settings: Settings
  games: Game[]
  onSave(patch: Partial<Settings>): Promise<void>
}

export function LibraryTab({
  settings,
  games,
  onSave,
  scanning,
  onScan,
  onImported,
  onReset
}: Props & {
  scanning: boolean
  onScan(): unknown
  onImported(): void
  onReset(): void
}): React.JSX.Element {
  const [scanBusy, setScanBusy] = useState(false)
  const busy = scanBusy || scanning
  const startScan = async (): Promise<void> => {
    setScanBusy(true)
    await withMinDuration(onScan, SCAN_FEEDBACK_MS)
    setScanBusy(false)
  }
  return (
    <>
      <Group title={t('settings.folders')}>
        <Row label={t('settings.foldersRow')} stacked>
          <FolderList
            paths={settings.libraryPaths}
            onChange={(libraryPaths) => onSave({ libraryPaths })}
            games={withoutHidden(games, settings.hiddenGames)}
            scanning={busy}
          />
        </Row>
      </Group>
      <Group>
        <Row label={t('settings.rescan')} desc={t('settings.rescanDesc')}>
          <button
            className="ghost scan-btn"
            onClick={() => void startScan()}
            disabled={busy || !settings.libraryPaths.length}
            aria-busy={busy}
            data-tooltip={settings.libraryPaths.join('\n')}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? t('settings.scanBusy') : t('settings.scan')}
          </button>
        </Row>
      </Group>
      <BackupGroup onImported={onImported} />
      {import.meta.env.DEV && <ResetGroup onReset={onReset} />}
    </>
  )
}

export function HiddenTab({ settings, games, onSave }: Props): React.JSX.Element {
  const hidden = hiddenGamesOf(games, settings.hiddenGames)
  if (hidden.length === 0)
    return (
      <div className="empty">
        <h4>{t('settings.hiddenEmpty')}</h4>
        <p>{t('settings.hiddenEmptyDesc')}</p>
      </div>
    )
  return (
    <Group title={t('settings.hiddenCount', { n: hidden.length })}>
      <ul className="hidden-list" aria-label={t('settings.tabHidden')}>
        {hidden.map((g) => (
          <li key={g.id} className="settings-row">
            <span className="hidden-thumb">
              <Cover game={g} />
            </span>
            <span className="hidden-info">
              <span className="hidden-name">{g.name}</span>
              <span className="muted">
                {kindLabel(g)} · {PLATFORM_LABEL[g.platform]}
              </span>
            </span>
            <button
              className="ghost"
              aria-label={t('settings.showGame', { name: g.name })}
              onClick={() => onSave({ hiddenGames: showGame(settings.hiddenGames, g.id) })}
            >
              {t('common.show')}
            </button>
          </li>
        ))}
      </ul>
    </Group>
  )
}
