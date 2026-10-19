import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { Settings } from '../../../../shared/types'
import { Group, Row, Switch } from './controls'

interface Props {
  settings: Settings
  onSave(patch: Partial<Settings>): Promise<void>
}

export function ImagesTab({ settings, onSave }: Props): React.JSX.Element {
  const [key, setKey] = useState('')
  return (
    <Group title={t('settings.covers')}>
      <Switch
        id="set-base"
        checked={settings.useBaseRomCovers}
        onChange={(on) => onSave({ useBaseRomCovers: on })}
        desc={t('settings.baseCoversDesc')}
      >
        {t('settings.baseCovers')}
      </Switch>
      <Switch id="set-sgdb" checked={settings.useSteamGridDb} onChange={(on) => onSave({ useSteamGridDb: on })}>
        {t('settings.sgdbUse')}
      </Switch>
      {settings.useSteamGridDb && (
        <Row label={t('settings.sgdbKey')} htmlFor="set-sgdb-key" stacked>
          {/* The saved key never reaches the renderer: this field only replaces it */}
          <div className="field-row">
            <input
              id="set-sgdb-key"
              className="input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onBlur={() => {
                if (key.trim()) {
                  void onSave({ steamGridDbKey: key.trim() })
                  setKey('')
                }
              }}
              placeholder={settings.hasSteamGridDbKey ? t('settings.sgdbKeySaved') : t('settings.sgdbKeyHint')}
            />
            {settings.hasSteamGridDbKey && (
              <button className="ghost danger" onClick={() => onSave({ steamGridDbKey: '' })}>
                {t('settings.sgdbKeyDelete')}
              </button>
            )}
          </div>
        </Row>
      )}
    </Group>
  )
}
