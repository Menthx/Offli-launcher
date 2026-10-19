import { resolveLanguage, setLanguage } from '../../shared/i18n'
import type { Settings } from '../../shared/types'
import { applyTheme } from './theme'

/** Applied during App render so the views drawn right after already use the right language */
export function applyAppearance(settings: Pick<Settings, 'theme' | 'language'>): void {
  applyTheme(settings.theme)
  const lang = resolveLanguage(settings.language, navigator.language)
  setLanguage(lang)
  document.documentElement.lang = lang
}
