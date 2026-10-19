import { useState } from 'react'
import { type TKey, t } from '../../../../shared/i18n'
import type { EmulatorPlatform, Settings } from '../../../../shared/types'
import { Icon } from '../icons'
import { Group, Row } from './controls'

/** Console names stay untranslated; hints are translation keys */
const EMULATORS: {
  id: EmulatorPlatform
  label: string
  hint: TKey | string
}[] = [
  { id: 'gba', label: 'Game Boy Advance', hint: 'settings.hintMgba' },
  { id: 'gb', label: 'Game Boy', hint: 'settings.hintGb' },
  { id: 'gbc', label: 'Game Boy Color', hint: 'settings.hintGb' },
  { id: 'nds', label: 'Nintendo DS', hint: 'settings.hintNds' },
  { id: '3ds', label: 'Nintendo 3DS', hint: 'Azahar' }
]
const hintOf = (hint: string): string => (hint.includes('.') ? t(hint as TKey) : hint)

interface Props {
  settings: Settings
  onSave(patch: Partial<Settings>): Promise<void>
}

/** One executable per platform (empty = default app), plus Wine */
export function EmulatorsTab({ settings, onSave }: Props): React.JSX.Element {
  const [wine, setWine] = useState(settings.winePath)
  const setEmulator = (id: EmulatorPlatform, path: string): Promise<void> =>
    onSave({ emulators: { ...settings.emulators, [id]: { path } } })

  return (
    <>
      <Group title={t('settings.emulators')}>
        {EMULATORS.map((e) => (
          <Row key={e.id} label={e.label} desc={hintOf(e.hint)} htmlFor={`emu-${e.id}`}>
            <input
              id={`emu-${e.id}`}
              className="input settings-path-input"
              readOnly
              value={settings.emulators[e.id].path}
              placeholder={t('settings.defaultApp')}
            />
            <button
              className="icon-btn"
              aria-label={t('settings.browseFor', { name: e.label })}
              data-tooltip={t('settings.browse')}
              onClick={async () => {
                const path = await window.offli.pickFile('executable')
                if (path) await setEmulator(e.id, path)
              }}
            >
              <Icon name="folder" />
            </button>
            <button
              className="icon-btn"
              aria-label={t('settings.useDefaultFor', { name: e.label })}
              data-tooltip={t('settings.defaultApp')}
              disabled={!settings.emulators[e.id].path}
              onClick={() => setEmulator(e.id, '')}
            >
              <Icon name="close" size={14} />
            </button>
          </Row>
        ))}
      </Group>
      <Group title={t('settings.wineGroup')}>
        <Row label="Wine" desc={t('settings.wineDesc')} htmlFor="set-wine">
          <input
            id="set-wine"
            className="input settings-path-input"
            value={wine}
            onChange={(e) => setWine(e.target.value)}
            onBlur={() => onSave({ winePath: wine })}
          />
        </Row>
      </Group>
    </>
  )
}
