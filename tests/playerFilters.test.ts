import { describe, expect, it } from 'vitest'
import type { Game } from '../src/shared/types'
import { filterLabel, matches, playerFilters } from '../src/renderer/src/views/library/filters'

const game = { id: 'a', name: 'Uranium', kind: 'fangame', platform: 'pc', path: '', dir: '' } as Game

describe('filtres statut et collection', () => {
  const stats = {
    a: { playtimeSec: 0, favorite: false, status: 'done' as const, tags: ['Nuzlocke'] },
    b: { playtimeSec: 0, favorite: false, tags: ['Amis', 'Nuzlocke'] }
  }

  it('ne propose que les statuts et collections utilisés', () => {
    expect(playerFilters(stats)).toEqual({ status: ['status:done'], tags: ['tag:Amis', 'tag:Nuzlocke'] })
  })

  it('filtre par statut et par collection', () => {
    expect(matches('status:done', game, stats.a)).toBe(true)
    expect(matches('status:todo', game, stats.a)).toBe(false)
    expect(matches('tag:Nuzlocke', game, stats.a)).toBe(true)
    expect(matches('tag:Amis', game, stats.a)).toBe(false)
  })

  it('affiche le nom de la collection tel quel', () => {
    expect(filterLabel('tag:Nuzlocke')).toBe('Nuzlocke')
  })
})
