import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings } from '../src/main/store'
import { TOUR_STEPS, libraryStatus, shouldAutoStartTour, tourReduce } from '../src/renderer/src/tour'

describe('tutoriel', () => {
  it('compte six étapes', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(['welcome', 'folders', 'sidebar', 'detail', 'settings', 'bigpicture'])
  })

  it('avance, recule et ne descend pas sous la première étape', () => {
    expect(tourReduce(0, 'next')).toEqual({ step: 1 })
    expect(tourReduce(3, 'back')).toEqual({ step: 2 })
    expect(tourReduce(0, 'back')).toEqual({ step: 0 })
  })

  it('se termine après la dernière étape', () => {
    expect(tourReduce(TOUR_STEPS.length - 1, 'next')).toEqual({ done: 'finished' })
  })

  it('peut être passé à tout moment', () => {
    expect(tourReduce(2, 'skip')).toEqual({ done: 'skipped' })
  })

  it("s'ouvre seul seulement au premier lancement, une fois un dossier choisi", () => {
    expect(shouldAutoStartTour({ tutorialDone: false, libraryPaths: ['D:\\Pokemon'] })).toBe(true)
    expect(shouldAutoStartTour({ tutorialDone: false, libraryPaths: [] })).toBe(false)
    expect(shouldAutoStartTour({ tutorialDone: true, libraryPaths: ['D:\\Pokemon'] })).toBe(false)
  })

  it('résume la bibliothèque', () => {
    const games = [{ kind: 'fangame' }, { kind: 'fangame' }, { kind: 'romhack' }]
    expect(libraryStatus(games)).toBe('3 jeux trouvés · 2 fangames, 1 ROM')
    expect(libraryStatus([])).toBe('0 jeu trouvé · 0 fangame, 0 ROM')
  })
})

describe('réglage tutorialDone', () => {
  it('vaut false par défaut et garde la valeur enregistrée', () => {
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), {}).tutorialDone).toBe(false)
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { tutorialDone: true }).tutorialDone).toBe(true)
    expect(mergeSettings(structuredClone(DEFAULT_SETTINGS), { tutorialDone: 'oui' }).tutorialDone).toBe(false)
  })
})
