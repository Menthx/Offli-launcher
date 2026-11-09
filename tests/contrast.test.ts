import { describe, expect, it } from 'vitest'
import { contrast, over, resolve, themeVars } from './helpers/themeColors'

/** WCAG AA for all 5 themes: 4.5:1 for text, 3:1 for icons and decorative text (text-subtle) */
const THEMES = ['doux', 'console', 'electrique', 'pokeball', 'emeraude']

/** [text, background layers (each over the one below), minimum] */
const PAIRS: [string, string[], number][] = [
  ['text', ['bg'], 4.5],
  ['text', ['surface'], 4.5],
  ['text', ['elevated'], 4.5],
  ['text', ['elevated-hover'], 4.5],
  ['text-muted', ['bg'], 4.5],
  ['text-muted', ['surface'], 4.5],
  ['text-muted', ['elevated'], 4.5],
  ['text-muted', ['elevated-hover'], 4.5],
  ['text-muted', ['inset'], 4.5],
  ['accent', ['bg'], 4.5],
  ['accent', ['surface', 'accent-soft'], 4.5],
  ['accent', ['elevated', 'accent-soft'], 4.5],
  ['accent-text', ['accent'], 4.5],
  ['danger', ['elevated'], 4.5],
  ['text-subtle', ['bg'], 3],
  ['text-subtle', ['surface'], 3],
  ['fav-on', ['surface'], 3]
]

describe.each(THEMES)('thème %s', (theme) => {
  const vars = themeVars(theme)
  const color = (name: string): ReturnType<typeof resolve> =>
    resolve(vars, `var(--color-${name})`.replace('--color-fav-on', '--fav-on'))

  it.each(PAIRS)('%s sur %j ≥ %d:1', (fg, layers, min) => {
    const bg = layers.reduce((acc, layer) => over(color(layer), acc), color(layers[0]))
    expect(contrast(over(color(fg), bg), bg)).toBeGreaterThanOrEqual(min)
  })

  it('texte du bouton Jouer ≥ 4,5:1', () => {
    const play = resolve(vars, 'var(--play-bg)')
    expect(contrast(resolve(vars, 'var(--play-text)'), play)).toBeGreaterThanOrEqual(4.5)
  })
})
