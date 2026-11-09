import { afterEach, describe, expect, it } from 'vitest'
import { type Dict, resolveLanguage, setLanguage, t } from '../src/shared/i18n'
import { en } from '../src/shared/i18n/en'
import { es } from '../src/shared/i18n/es'
import { fr } from '../src/shared/i18n/fr'
import { errorCode } from '../src/main/updateSupport'
import { baseGameName } from '../src/renderer/src/format'

/** Every entry as 'section.key' → texts (one or two forms) */
function flatten(dict: object, prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(dict)) {
    const key = prefix + k
    if (typeof v === 'string') out[key] = [v]
    else if ('one' in v) out[key] = [v.one, v.other]
    else Object.assign(out, flatten(v, key + '.'))
  }
  return out
}
const params = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionnaires', () => {
  const ref = flatten(fr)
  for (const [name, dict] of [
    ['en', en],
    ['es', es]
  ] as [string, Dict][]) {
    it(`${name} a exactement les clés du français, avec les mêmes paramètres`, () => {
      const other = flatten(dict)
      expect(Object.keys(other).sort()).toEqual(Object.keys(ref).sort())
      for (const [key, texts] of Object.entries(ref)) {
        expect(other[key].map(params), key).toEqual(texts.map(params))
        expect(
          other[key].every((s) => s.trim().length > 0),
          key
        ).toBe(true)
      }
    })
  }
})

describe('t()', () => {
  afterEach(() => setLanguage('fr'))

  it('remplace les paramètres et choisit singulier ou pluriel selon la langue', () => {
    expect(t('library.launching', { name: 'Uranium' })).toBe('Lancement de Uranium…')
    expect(t('folders.gamesFound', { n: 0 })).toBe('0 jeu trouvé')
    setLanguage('en')
    expect(t('folders.gamesFound', { n: 0 })).toBe('0 games found')
    expect(t('folders.gamesFound', { n: 1 })).toBe('1 game found')
    setLanguage('es')
    expect(t('settings.hiddenCount', { n: 3 })).toBe('3 juegos ocultos')
  })

  it('« auto » suit la langue du système, anglais par défaut', () => {
    expect(resolveLanguage('auto', 'fr-FR')).toBe('fr')
    expect(resolveLanguage('auto', 'es_MX')).toBe('es')
    expect(resolveLanguage('auto', 'de-DE')).toBe('en')
    expect(resolveLanguage('es', 'fr-FR')).toBe('es')
  })
})

describe('erreurs de mise à jour', () => {
  it('classe les erreurs pour les traduire côté rendu', () => {
    expect(errorCode(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('network')
    expect(errorCode(new Error('Cannot find latest.yml in the latest release artifacts (404)'))).toBe('no-release')
    expect(errorCode('boom')).toBe('unknown')
  })
})

describe('noms des jeux de base', () => {
  afterEach(() => setLanguage('fr'))
  it('suivent la langue, d’après le code de la ROM', () => {
    expect(baseGameName({ code: 'BPRE', name: 'Rouge Feu' })).toBe('Rouge Feu')
    setLanguage('en')
    expect(baseGameName({ code: 'BPRE', name: 'Rouge Feu' })).toBe('FireRed')
    expect(baseGameName({ code: 'PM_CRYSTAL', name: 'Cristal' })).toBe('Crystal')
    setLanguage('es')
    expect(baseGameName({ code: 'IREO', name: 'Noir 2' })).toBe('Negra 2')
    expect(baseGameName({ code: 'ZZZZ', name: 'Inconnu' })).toBe('Inconnu')
  })
})
