import { ref } from 'vue'
import {
  type Lang,
  type TKey,
  getLanguage as sharedLanguage,
  setLanguage as setShared,
  t as sharedT
} from '../../shared/i18n'

/** Shared translations, made reactive: views drawn with t() follow a language change */
export { LANGUAGES, resolveLanguage, type Lang, type LanguagePref, type TKey } from '../../shared/i18n'

const lang = ref<Lang>(sharedLanguage())

export function setLanguage(next: Lang): void {
  setShared(next)
  lang.value = next
}

export function getLanguage(): Lang {
  return lang.value
}

export function t(key: TKey, params?: Record<string, string | number>): string {
  // Read so templates and computed values depend on the current language
  void lang.value
  return sharedT(key, params)
}
