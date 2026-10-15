import type { Theme } from '../../../shared/types'
import './console.css'
import './emeraude.css'

/** Thèmes disponibles (un fichier CSS chacun dans ce dossier), avec leur nom affiché */
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'console', label: 'Console' },
  { id: 'emeraude', label: 'Émeraude' }
]

/** Applique un thème à toute l'interface */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
}
