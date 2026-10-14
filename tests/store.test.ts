import { describe, expect, it } from 'vitest'
import type { Game } from '../src/shared/types'
import { DEFAULT_SETTINGS, applyNames, mergeSettings } from '../src/main/store'

describe('mergeSettings', () => {
  it('complète un fichier partiel avec les valeurs par défaut', () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { libraryPath: 'D:\\Jeux' })
    expect(s.libraryPath).toBe('D:\\Jeux')
    expect(s.emulators.gba.args).toEqual(['{rom}'])
  })

  it("retire l'ancien réglage viewMode", () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { viewMode: 'bigpicture' })
    expect('viewMode' in s).toBe(false)
  })
})

describe('applyNames', () => {
  const game = (id: string, name: string): Game => ({ id, name, kind: 'fangame', platform: 'pc', path: '', dir: '' })

  it('remplace le nom et garde le nom détecté', () => {
    const [g] = applyNames([game('a', 'Reborn')], { a: '  Pokémon Reborn  ' })
    expect(g).toMatchObject({ name: 'Pokémon Reborn', originalName: 'Reborn' })
  })

  it('ignore un nom vide ou identique', () => {
    const games = applyNames([game('a', 'Reborn'), game('b', 'Uranium')], { a: '   ', b: 'Uranium' })
    expect(games.every((g) => g.originalName === undefined)).toBe(true)
  })

  it('trie par nom affiché', () => {
    const games = applyNames([game('a', 'Alpha'), game('b', 'Beta')], { a: 'Zêta' })
    expect(games.map((g) => g.name)).toEqual(['Beta', 'Zêta'])
  })
})

it('mergeSettings garde les noms choisis', () => {
  const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { nameOverrides: { a: 'X' } })
  expect(s.nameOverrides).toEqual({ a: 'X' })
  expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), {}).nameOverrides).toEqual({})
})
