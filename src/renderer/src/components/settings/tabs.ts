import type { TKey } from '../../i18n'

export const TABS = [
  { id: 'library', label: 'settings.tabLibrary' },
  { id: 'display', label: 'settings.tabDisplay' },
  { id: 'emulators', label: 'settings.tabEmulators' },
  { id: 'images', label: 'settings.tabImages' },
  { id: 'hidden', label: 'settings.tabHidden' }
] as const satisfies readonly { id: string; label: TKey }[]
export type Tab = (typeof TABS)[number]['id']

/** Last open tab, kept for the session */
let last: Tab = 'library'
export const lastTab = (): Tab => last
export const rememberTab = (tab: Tab): void => {
  last = tab
}

/** Key → next tab index (arrows, Home/End), -1 otherwise */
export function nextTab(key: string, i: number): number {
  const n = TABS.length
  if (key === 'ArrowDown' || key === 'ArrowRight') return (i + 1) % n
  if (key === 'ArrowUp' || key === 'ArrowLeft') return (i + n - 1) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return -1
}
