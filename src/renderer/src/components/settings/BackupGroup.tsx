import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { DataResult } from '../../../../shared/types'
import { Icon } from '../icons'
import { Group, Row } from './controls'

export function BackupGroup({ onImported }: { onImported(): void }): React.JSX.Element {
  const [message, setMessage] = useState<{ text: string; error: boolean }>()

  const run = async (action: 'export' | 'import'): Promise<void> => {
    const r: DataResult | null = await (action === 'export' ? window.offli.exportData() : window.offli.importData())
    if (!r) return // cancelled
    if (r.ok) {
      setMessage({
        text: t(action === 'export' ? 'settings.exported' : 'settings.imported'),
        error: false
      })
      if (action === 'import') onImported()
    } else
      setMessage({
        text: t(r.error === 'invalid' ? 'settings.backupInvalid' : 'settings.backupIo'),
        error: true
      })
  }

  return (
    <Group title={t('settings.backup')}>
      <Row label={t('settings.backupRow')} desc={t('settings.backupDesc')}>
        <button className="ghost" onClick={() => void run('export')}>
          <Icon name="download" size={14} />
          {t('settings.export')}
        </button>
        <button className="ghost" onClick={() => void run('import')}>
          <Icon name="upload" size={14} />
          {t('settings.import')}
        </button>
      </Row>
      {message && (
        <p className={`settings-note ${message.error ? 'is-error' : ''}`} role="status">
          {message.text}
        </p>
      )}
    </Group>
  )
}
