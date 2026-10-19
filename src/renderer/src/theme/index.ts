import { t } from '../../../shared/i18n'
import type { Theme } from '../../../shared/types'
import './tokens.css'
import './motion.css'
import './console.css'
import './electrique.css'
import './emeraude.css'
import './pokeball.css'

/** 'Doux' (DA pack, tokens.css) plus four Pokémon palettes that only override colors; swatches: bg, panel, accent, text */
export const THEMES: { id: Theme; swatches: string[] }[] = [
  { id: 'doux', swatches: ['#16181d', '#2a2e37', '#7fa7e8', '#d6d9de'] },
  { id: 'console', swatches: ['#16122b', '#342a66', '#ffcb05', '#f2efff'] },
  { id: 'electrique', swatches: ['#0e1729', '#22355c', '#ffd23f', '#6fa8f0'] },
  { id: 'pokeball', swatches: ['#141518', '#2c2f36', '#ff6e60', '#f7f7f5'] },
  { id: 'emeraude', swatches: ['#0d2e2c', '#226d68', '#d6955b', '#feeaa1'] }
]

export const themeLabel = (id: Theme): string => t(`themes.${id}`)

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
}
