import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withMinDuration } from '../src/renderer/src/minDuration'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Avance les faux minuteurs et indique si la promesse est terminée */
async function settledAfter(p: Promise<void>, ms: number): Promise<boolean> {
  let done = false
  void p.then(() => (done = true))
  await vi.advanceTimersByTimeAsync(ms)
  return done
}

describe('withMinDuration', () => {
  it('dure au moins 2 s même si le scan est instantané', async () => {
    const p = withMinDuration(() => Promise.resolve(), 2000)
    expect(await settledAfter(p, 1999)).toBe(false)
    expect(await settledAfter(p, 1)).toBe(true)
  })

  it('attend la fin d’un scan plus long que 2 s', async () => {
    const scan = () => new Promise<void>((r) => setTimeout(r, 5000))
    const p = withMinDuration(scan, 2000)
    expect(await settledAfter(p, 2000)).toBe(false)
    expect(await settledAfter(p, 3000)).toBe(true)
  })

  it('revient à l’état initial si le scan échoue', async () => {
    const p = withMinDuration(() => Promise.reject(new Error('dossier introuvable')), 2000)
    expect(await settledAfter(p, 2000)).toBe(true)
  })
})
