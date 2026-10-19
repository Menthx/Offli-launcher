import { t } from '../../shared/i18n'

/** React-free (testable in Node), compatible with MenuAction */
export interface ActionSpec<I> {
  label: string
  icon: I
  run(): void
  disabled?: boolean
  hint?: string
}

/** Always shown; disabled with a hint until an API key is saved */
export function steamGridDbAction<I>(hasKey: boolean, icon: I, open: () => void): ActionSpec<I> {
  return hasKey
    ? { label: t('detail.sgdbPick'), icon, run: open }
    : {
        label: t('detail.sgdbPick'),
        icon,
        disabled: true,
        hint: t('detail.sgdbHint'),
        run: () => undefined
      }
}
