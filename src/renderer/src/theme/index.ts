import './offli.css'

/** Thèmes disponibles : chacun est un fichier CSS de ce dossier */
export const THEMES = ['offli'] as const
export type Theme = (typeof THEMES)[number]

/** Applique un thème à toute l'interface */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme
}
