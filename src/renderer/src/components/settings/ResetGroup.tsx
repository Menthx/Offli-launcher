import { useEffect, useRef, useState } from 'react'
import { t } from '../../../../shared/i18n'
import { Icon } from '../icons'
import { Group, Row } from './controls'

/** Puts every setting back to its default, after an inline confirmation */
export function ResetGroup({ onReset }: { onReset(): void }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)

  // Focus lands on Cancel, so a stray Enter doesn't wipe everything
  useEffect(() => {
    if (confirming) cancel.current?.focus()
  }, [confirming])

  const reset = async (): Promise<void> => {
    if (await window.offli.resetSettings()) onReset()
    else setFailed(true)
    setConfirming(false)
  }

  return (
    <Group title={t('settings.reset')}>
      <Row label={t('settings.resetRow')} desc={t('settings.resetDesc')}>
        {!confirming && (
          <button className="ghost danger" onClick={() => setConfirming(true)}>
            <Icon name="reset" size={14} />
            {t('settings.resetButton')}
          </button>
        )}
      </Row>
      {confirming && (
        <div className="settings-row" role="alertdialog" aria-labelledby="reset-confirm">
          <p className="settings-row__label" id="reset-confirm">
            {t('settings.resetConfirm')}
          </p>
          <div className="settings-row__control">
            <button ref={cancel} className="ghost" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
            <button className="ghost danger" onClick={() => void reset()}>
              {t('settings.resetConfirmButton')}
            </button>
          </div>
        </div>
      )}
      {failed && (
        <p className="settings-note is-error" role="status">
          {t('settings.resetFailed')}
        </p>
      )}
    </Group>
  )
}
