import type { Game } from '../../shared/types'

export const PLATFORM_LABEL: Record<Game['platform'], string> = {
  pc: 'PC',
  gb: 'GB',
  gbc: 'GBC',
  gba: 'GBA',
  nds: 'NDS',
  '3ds': '3DS'
}

export function kindLabel(g: Game): string {
  return g.kind === 'fangame' ? 'Fangame' : g.kind === 'baserom' ? 'ROM de base' : 'Romhack'
}

export function playtime(sec: number): string {
  if (sec < 60) return sec ? '< 1 min' : '0 h'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export function lastPlayed(ts?: number): string {
  if (!ts) return 'Jamais'
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 14) return `Il y a ${days} j`
  if (days < 60) return `Il y a ${Math.floor(days / 7)} sem`
  return `Il y a ${Math.floor(days / 30)} mois`
}
