import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Reads theme colors from the CSS files, resolving var() and color-mix(in srgb, …) */
type RGBA = [number, number, number, number]
const DIR = join(__dirname, '../../src/renderer/src/theme')

function block(css: string, selector: RegExp): Record<string, string> {
  const m = selector.exec(css)
  if (!m) throw new Error(`bloc introuvable : ${selector}`)
  const body = css.slice(m.index + m[0].length, css.indexOf('}', m.index))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]))
}

export function themeVars(theme: string): Record<string, string> {
  const base = block(readFileSync(join(DIR, 'tokens.css'), 'utf8'), /:root\s*\{/)
  if (theme === 'doux') return base
  return {
    ...base,
    ...block(readFileSync(join(DIR, `${theme}.css`), 'utf8'), new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{`))
  }
}

export function resolve(vars: Record<string, string>, value: string): RGBA {
  value = value.trim()
  const v = /^var\(--([\w-]+)\)$/.exec(value)
  if (v) return resolve(vars, vars[v[1]])
  if (value === 'transparent') return [0, 0, 0, 0]
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value)
  if (hex) {
    let h = hex[1]
    if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    const n = (i: number): number => parseInt(h.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(value)
  if (mix) {
    const a = resolve(vars, mix[1])
    const b = resolve(vars, mix[3])
    const p = Number(mix[2]) / 100
    const alpha = a[3] * p + b[3] * (1 - p)
    const ch = (i: number): number => (alpha ? (a[i] * a[3] * p + b[i] * b[3] * (1 - p)) / alpha : 0)
    return [ch(0), ch(1), ch(2), alpha]
  }
  throw new Error(`couleur non gérée : ${value}`)
}

/** Color composited over a background */
export function over(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3]
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]
}

function luminance([r, g, b]: RGBA): number {
  const c = [r, g, b].map((x) => {
    const s = x / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contrast(a: RGBA, b: RGBA): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
