import { t } from '../../shared/i18n'
import type { UpdateStatus } from '../../shared/types'

export type UpdateAction = 'check' | 'download' | 'open-page' | 'confirm-install' | 'none'

export interface UpdateView {
  /** aria-label, also announced to screen readers */
  label: string
  tooltip: string
  /** Accent: update available; play green: ready to install */
  badge: 'accent' | 'play' | null
  /** Spinner while checking; a progress ring is drawn while downloading */
  busy: boolean
  percent?: number
  action: UpdateAction
  disabled: boolean
  /** Short message under the button (errors) */
  message?: string
}

const ERRORS = {
  network: 'update.errNetwork',
  'no-release': 'update.errNoRelease',
  unknown: 'update.errUnknown'
} as const

/** Update state → sidebar button */
export function updateView(status: UpdateStatus, version: string): UpdateView {
  const base = { badge: null, busy: false, disabled: false } as const
  const same = (text: string): { label: string; tooltip: string } => ({
    label: text,
    tooltip: text
  })
  switch (status.state) {
    case 'idle':
      return { ...base, ...same(t('update.check')), action: 'check' }
    case 'checking':
      return {
        ...base,
        ...same(t('update.checking')),
        busy: true,
        action: 'none',
        disabled: true
      }
    case 'not-available':
      return {
        ...base,
        ...same(t('update.upToDate', { version })),
        action: 'check'
      }
    case 'available':
      return {
        ...base,
        label: t('update.availableLabel', { version: status.version }),
        tooltip: t('update.available', { version: status.version }),
        badge: 'accent',
        action: 'download'
      }
    case 'downloading':
      return {
        ...base,
        ...same(t('update.downloading', { percent: status.percent })),
        busy: true,
        percent: status.percent,
        action: 'none',
        disabled: true
      }
    case 'downloaded':
      return {
        ...base,
        label: t('update.readyLabel', { version: status.version }),
        tooltip: t('update.ready', { version: status.version }),
        badge: 'play',
        action: 'confirm-install'
      }
    case 'error': {
      const message = t(ERRORS[status.code] ?? ERRORS.unknown)
      return {
        ...base,
        label: t('update.errorLabel', { message }),
        tooltip: t('update.error', { message }),
        action: 'check',
        message
      }
    }
    case 'unsupported':
      if (status.reason === 'dev')
        return {
          ...base,
          ...same(t('update.dev')),
          action: 'none',
          disabled: true
        }
      if (status.version)
        return {
          ...base,
          label: t('update.manualLabel', { version: status.version }),
          tooltip: t('update.manual', { version: status.version }),
          badge: 'accent',
          action: 'open-page'
        }
      return {
        ...base,
        label: t('update.pageLabel'),
        tooltip: t('update.page'),
        action: 'open-page'
      }
  }
}
