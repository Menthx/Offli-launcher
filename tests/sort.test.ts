import { describe, expect, it } from 'vitest'
import type { Game } from '../src/shared/types'
import { sortGames } from '../src/renderer/src/views/library/filters'

const g = (id: string, name: string): Game => ({ id, name, kind: 'fangame', platform: 'pc', path: '', dir: '' })
const games = [g('a', 'Uranium'), g('b', 'Insurgence'), g('c', 'Reborn')]
const stats = {
  a: { playtimeSec: 10, favorite: false, lastPlayed: 3 },
  b: { playtimeSec: 500, favorite: false, lastPlayed: 1 }
}

describe('tri de la bibliothèque', () => {
  it('par nom, par date de dernière session ou par temps de jeu', () => {
    expect(sortGames(games, stats, 'name').map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(sortGames(games, stats, 'recent').map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(sortGames(games, stats, 'playtime').map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('ne modifie pas la liste d’origine', () => {
    sortGames(games, stats, 'name')
    expect(games.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
