import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from '../src/main/store'
import { hideGame, hiddenGamesOf, showGame, withoutHidden } from '../src/renderer/src/hiddenGames'

const games = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('jeux masqués', () => {
  it('retire les jeux masqués de la bibliothèque', () => {
    expect(withoutHidden(games, ['b']).map((g) => g.id)).toEqual(['a', 'c'])
    expect(withoutHidden(games, [])).toBe(games)
  })

  it('liste les jeux masqués encore présents, dans l’ordre où ils ont été masqués', () => {
    expect(hiddenGamesOf(games, ['c', 'disparu', 'a']).map((g) => g.id)).toEqual(['c', 'a'])
  })

  it('masque et réaffiche sans doublon', () => {
    expect(hideGame(['a'], 'b')).toEqual(['a', 'b'])
    expect(hideGame(['a'], 'a')).toEqual(['a'])
    expect(showGame(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('réglage hiddenGames', () => {
  it('est vide par défaut et garde la liste enregistrée (ids stables, survivent aux rescans)', () => {
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), {}).hiddenGames).toEqual([])
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { hiddenGames: ['abc123', 42, 'def456'] }).hiddenGames).toEqual([
      'abc123',
      'def456'
    ])
  })
})
