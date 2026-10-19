import { describe, expect, it } from 'vitest'
import { pixelStats, titleScore } from '../src/main/cover/titles'

const px = (...pixels: number[][]): Buffer => Buffer.from(pixels.flat())

describe('pixelStats', () => {
  it('compte les pixels opaques et leurs couleurs', () => {
    const s = pixelStats(px([255, 0, 0, 255], [250, 2, 1, 255], [0, 0, 255, 255], [0, 0, 0, 0]))
    expect(s.coverage).toBe(0.75)
    // Near-identical reds share a 4-bit bucket
    expect(s.colors).toBe(2)
  })
})

describe('titleScore', () => {
  const full = { width: 512, height: 384, coverage: 1, colors: 300 }
  it('refuse les petites images et les images sans détail', () => {
    expect(titleScore('title', { ...full, width: 120 })).toBe(0)
    expect(titleScore('logo', { ...full, coverage: 0.05 })).toBe(0)
    expect(titleScore('logo', { ...full, colors: 3 })).toBe(0)
  })

  it('met un logo devant un écran complet', () => {
    expect(titleScore('logo1', { ...full, coverage: 0.3 })).toBeGreaterThan(titleScore('title', full))
  })
})
