import { LANGUAGES, type LanguagePref, t } from '../../../../shared/i18n'
import type { Settings, StartView } from '../../../../shared/types'
import { THEMES, themeLabel } from '../../theme'
import { Select } from '../Select'
import { Group, Row, Switch } from './controls'

interface Props {
  settings: Settings
  onSave(patch: Partial<Settings>): Promise<void>
  onReplayTour(): void
}

export function DisplayTab({ settings, onSave, onReplayTour }: Props): React.JSX.Element {
  const startViews: [StartView, string][] = [
    ['library', t('common.library')],
    ['bigpicture', t('common.bigPicture')]
  ]
  // Arrows toggle the two options and move focus (radio group)
  const onStartKey = (e: React.KeyboardEvent<HTMLButtonElement>, v: StartView): void => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    const other: StartView = v === 'library' ? 'bigpicture' : 'library'
    void onSave({ startView: other })
    ;(e.currentTarget.parentElement?.querySelector(`[data-v="${other}"]`) as HTMLElement | null)?.focus()
  }

  return (
    <>
      <Group>
        <Row label={t('settings.language')} htmlFor="set-language">
          <Select<LanguagePref>
            id="set-language"
            className="settings-select"
            value={settings.language}
            onChange={(language) => void onSave({ language })}
            options={[
              { value: 'auto', label: t('settings.languageAuto') },
              ...LANGUAGES.map((l) => ({
                value: l.id,
                label: l.label,
                lang: l.id
              }))
            ]}
          />
        </Row>
      </Group>

      <Group title={t('settings.theme')} id="theme-label">
        <div className="theme-cards" role="group" aria-labelledby="theme-label">
          {THEMES.map((th) => (
            <button
              key={th.id}
              className={`theme-card ${settings.theme === th.id ? 'on' : ''}`}
              aria-pressed={settings.theme === th.id}
              onClick={() => onSave({ theme: th.id })}
            >
              <span className="swatches" aria-hidden="true">
                {th.swatches.map((c) => (
                  <span key={c} className="swatch" style={{ background: c }} />
                ))}
              </span>
              {themeLabel(th.id)}
            </button>
          ))}
        </div>
      </Group>

      <Group title={t('settings.startup')}>
        <Row label={t('settings.openAtStart')} labelId="start-label">
          <div className="seg" role="radiogroup" aria-labelledby="start-label">
            {startViews.map(([v, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={settings.startView === v}
                tabIndex={settings.startView === v ? 0 : -1}
                onClick={() => onSave({ startView: v })}
                onKeyDown={(e) => onStartKey(e, v)}
                data-v={v}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
        <Switch
          id="set-bp-fullscreen"
          checked={settings.bigPictureFullscreen}
          onChange={(on) => onSave({ bigPictureFullscreen: on })}
          desc={t('settings.bpFullscreenDesc')}
        >
          {t('settings.bpFullscreen')}
        </Switch>
      </Group>

      <Group title={t('settings.help')}>
        <Row label={t('settings.tour')} desc={t('settings.tourDesc')}>
          <button className="ghost" onClick={onReplayTour}>
            {t('settings.replayTour')}
          </button>
        </Row>
      </Group>
    </>
  )
}
