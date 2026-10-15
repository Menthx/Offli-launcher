import type { Theme } from '../../../shared/types'
import './motion.css'
import './console.css'
import './electrique.css'
import './emeraude.css'
import './pokeball.css'

/**
 * Thèmes disponibles (un fichier CSS chacun dans ce dossier), avec leur nom affiché et
 * l'aperçu de leur palette pour le choix dans les paramètres (fond, panneau, accent, texte).
 */
export const THEMES: { id: Theme; label: string; swatches: string[] }[] = [
  { id: 'console', label: 'Console', swatches: ['#16122b', '#342a66', '#ffcb05', '#f2efff'] },
  { id: 'electrique', label: 'Électrique', swatches: ['#0e1729', '#22355c', '#ffd23f', '#6fa8f0'] },
  { id: 'pokeball', label: 'Poké Ball', swatches: ['#141518', '#2c2f36', '#ff6e60', '#f7f7f5'] },
  { id: 'emeraude', label: 'Émeraude', swatches: ['#0d2e2c', '#226d68', '#d6955b', '#feeaa1'] }
]

/** Applique un thème à toute l'interface */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
}
