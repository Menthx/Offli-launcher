import { describe, expect, it } from 'vitest'
import { makeBackup, readBackup } from '../src/main/backup'
import { DEFAULT_SETTINGS } from '../src/main/store'

const settings = {
  ...structuredClone(DEFAULT_SETTINGS),
  steamGridDbKey: 'secret',
  libraryPaths: ['D:\\Jeux'],
  theme: 'console' as const
}
const stats = { a1: { playtimeSec: 3600, favorite: true, lastPlayed: 1_700_000_000_000 } }

describe('sauvegarde', () => {
  it("n'exporte jamais la clé SteamGridDB", () => {
    const b = makeBackup(settings, stats)
    expect(b.settings.steamGridDbKey).toBe('')
    expect(JSON.stringify(b)).not.toContain('secret')
  })

  it('relit réglages et statistiques, en gardant la clé actuelle', () => {
    const current = { ...structuredClone(DEFAULT_SETTINGS), steamGridDbKey: 'cle-locale' }
    const r = readBackup(JSON.stringify(makeBackup(settings, stats)), current)!
    expect(r.settings.libraryPaths).toEqual(['D:\\Jeux'])
    expect(r.settings.theme).toBe('console')
    expect(r.settings.steamGridDbKey).toBe('cle-locale')
    expect(r.stats).toEqual(stats)
  })

  it('refuse un fichier qui n’est pas une sauvegarde et nettoie les valeurs invalides', () => {
    expect(readBackup('pas du json', DEFAULT_SETTINGS)).toBeNull()
    expect(readBackup(JSON.stringify({ hello: 1 }), DEFAULT_SETTINGS)).toBeNull()
    const raw = { ...makeBackup(settings, {}), stats: { x: { playtimeSec: 'beaucoup', favorite: 'oui' } } }
    expect(readBackup(JSON.stringify(raw), DEFAULT_SETTINGS)!.stats).toEqual({ x: { playtimeSec: 0, favorite: false } })
  })
})
