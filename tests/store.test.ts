import { describe, expect, it } from 'vitest'
import type { Game } from '../src/shared/types'
import { DEFAULT_SETTINGS, applyNames, mergeSettings } from '../src/main/store'

describe('mergeSettings', () => {
  it('complète un fichier partiel avec les valeurs par défaut', () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { winePath: 'wine64' })
    expect(s.winePath).toBe('wine64')
    expect(s.libraryPaths).toEqual([])
    expect(s.emulators.gba).toEqual({ path: '' })
  })

  it("ignore l'ancien champ args des émulateurs", () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { emulators: { gba: { path: 'C:/mGBA/mGBA.exe', args: ['-f', '{rom}'] } } })
    expect(s.emulators.gba).toEqual({ path: 'C:/mGBA/mGBA.exe' })
    expect(s.emulators.nds).toEqual({ path: '' })
  })

  it('migre l’ancien dossier unique vers la liste de dossiers', () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { libraryPath: 'D:\\Pokemon' })
    expect(s.libraryPaths).toEqual(['D:\\Pokemon'])
    expect('libraryPath' in s).toBe(false)
  })

  it('garde la liste de dossiers', () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { libraryPaths: ['D:\\A', 'E:\\B'] })
    expect(s.libraryPaths).toEqual(['D:\\A', 'E:\\B'])
  })

  it("migre l'ancien réglage viewMode vers startView", () => {
    const s = mergeSettings(structuredClone(DEFAULT_SETTINGS), { viewMode: 'bigpicture' })
    expect(s.startView).toBe('bigpicture')
    expect('viewMode' in s).toBe(false)
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { viewMode: 'library' }).startView).toBe('library')
  })

  it('garde startView et ignore une valeur inconnue', () => {
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { startView: 'bigpicture' }).startView).toBe('bigpicture')
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { startView: 'grille' }).startView).toBe('library')
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
