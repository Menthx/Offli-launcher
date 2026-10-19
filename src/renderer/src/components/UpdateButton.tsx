import { useEffect, useRef, useState } from 'react'
import type { UpdateStatus } from '../../../shared/types'
import { t } from '../../../shared/i18n'
import { updateView } from '../updateUi'

/** Check, download and open the GitHub page on click; installing always asks first */
export function UpdateButton(): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [version, setVersion] = useState('')
  const [confirming, setConfirming] = useState(false)
  const restart = useRef<HTMLButtonElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    void window.offli.updateState().then((s) => {
      setStatus(s.status)
      setVersion(s.version)
    })
    return window.offli.onUpdateStatus(setStatus)
  }, [])

  useEffect(() => {
    if (confirming) restart.current?.focus()
  }, [confirming])

  const view = updateView(status, version)
  const target = status.state === 'downloaded' ? status.version : ''

  const onClick = (): void => {
    switch (view.action) {
      case 'check':
        void window.offli.updateCheck()
        break
      case 'download':
        void window.offli.updateDownload()
        break
      case 'open-page':
        void window.offli.updateOpenPage()
        break
      case 'confirm-install':
        setConfirming(true)
        break
    }
  }

  const closeConfirm = (): void => {
    setConfirming(false)
    button.current?.focus()
  }

  // Download progress ring
  const r = 15
  const circ = 2 * Math.PI * r

  return (
    <div className="update-wrap">
      <button
        ref={button}
        className="icon-square update-btn"
        onClick={onClick}
        disabled={view.disabled}
        aria-label={view.label}
        aria-busy={view.busy}
        data-tooltip={view.tooltip}
      >
        {view.busy && view.percent === undefined ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
          </svg>
        )}
        {view.percent !== undefined && (
          <svg className="update-ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              strokeWidth="2.5"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - view.percent / 100)}
            />
          </svg>
        )}
        {view.badge && <span className={`update-badge ${view.badge}`} aria-hidden="true" />}
      </button>
      {view.message && <span className="update-message">{view.message}</span>}
      {/* Announces state changes to screen readers */}
      <span className="visually-hidden" aria-live="polite">
        {status.state === 'idle' ? '' : view.label}
      </span>
      {confirming && (
        <div
          className="update-confirm"
          role="dialog"
          aria-modal="false"
          aria-labelledby="update-confirm-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeConfirm()
          }}
        >
          <p id="update-confirm-title">{t('update.confirm', { version: target })}</p>
          <div className="row-actions">
            <button className="ghost" onClick={closeConfirm}>
              {t('update.later')}
            </button>
            <button ref={restart} className="cta" onClick={() => void window.offli.updateInstall()}>
              {t('update.restart')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
