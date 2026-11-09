import { en } from './en'
import { es } from './es'
import { fr } from './fr'

/** UI translations shared by both processes; French is the reference, en/es must have the same keys */

export type Lang = 'fr' | 'en' | 'es'
export type LanguagePref = Lang | 'auto'

/** Plain text, or singular / plural forms picked from {n} */
export type Entry = string | { one: string; other: string }
type Shape<T> = { [K in keyof T]: T[K] extends Entry ? Entry : Shape<T[K]> }
export type Dict = Shape<typeof fr>

type Paths<T> = {
  [K in keyof T & string]: T[K] extends Entry ? K : `${K}.${Paths<T[K]>}`
}[keyof T & string]
export type TKey = Paths<typeof fr>

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' }
]

const DICTS: Record<Lang, Dict> = { fr, en, es }
let current: Lang = 'fr'

/** 'auto' uses the system language (fr-FR → fr), English otherwise */
export function resolveLanguage(pref: LanguagePref | undefined, systemLocale: string): Lang {
  if (pref && pref !== 'auto') return pref
  const base = systemLocale.toLowerCase().split(/[-_]/)[0]
  return LANGUAGES.some((l) => l.id === base) ? (base as Lang) : 'en'
}

export function setLanguage(lang: Lang): void {
  current = lang
}

export function getLanguage(): Lang {
  return current
}

function lookup(dict: Dict, key: string): Entry | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return typeof node === 'string' || (node && typeof node === 'object' && 'one' in node) ? (node as Entry) : undefined
}

/** {name} is replaced by params.name; {n} also picks singular or plural */
export function t(key: TKey, params: Record<string, string | number> = {}): string {
  const entry = lookup(DICTS[current], key) ?? lookup(fr, key) ?? key
  const text =
    typeof entry === 'string'
      ? entry
      : entry[new Intl.PluralRules(current).select(Number(params['n'] ?? 0)) === 'one' ? 'one' : 'other']
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
}
