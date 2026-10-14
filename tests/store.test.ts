import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from '../src/main/store'

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
