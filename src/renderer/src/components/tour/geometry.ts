import type { TourStep } from '../../tour'

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

/** Gap between the highlighted element and its ring */
export const PAD = 8
const BUBBLE_W = 320

/** Bounding box of every [data-tour="<target>"] element, or of the first one */
export function targetRect(target: string, first = false): Rect | null {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].slice(0, first ? 1 : undefined)
  if (!els.length) return null
  const rs = els.map((e) => e.getBoundingClientRect())
  const top = Math.min(...rs.map((r) => r.top))
  const left = Math.min(...rs.map((r) => r.left))
  const bottom = Math.max(...rs.map((r) => r.bottom))
  const right = Math.max(...rs.map((r) => r.right))
  return { top, left, width: right - left, height: bottom - top }
}

/** Bubble next to the highlighted element, kept fully on screen */
export function bubbleStyle(rect: Rect, side: TourStep['side'], cardH: number): React.CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampTop = (t: number): number => Math.max(16, Math.min(t, vh - cardH - 16))
  if (side === 'right')
    // Short element (settings gear): align with its bottom, otherwise a bit below its top
    return {
      top: clampTop(rect.height < 80 ? rect.top + rect.height - cardH : rect.top + 40),
      left: Math.min(rect.left + rect.width + PAD + 16, vw - BUBBLE_W - 16)
    }
  if (side === 'left')
    return {
      top: clampTop(rect.top),
      left: Math.max(16, rect.left - PAD - 16 - BUBBLE_W)
    }
  return {
    top: Math.max(16, rect.top - PAD - 16 - cardH),
    left: Math.max(16, Math.min(rect.left, vw - BUBBLE_W - 16))
  }
}

/** Keeps Tab focus inside the tutorial dialog */
export function trapFocus(e: React.KeyboardEvent, root: HTMLElement): void {
  const f = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input')]
  if (!f.length) return
  if (e.shiftKey && document.activeElement === f[0]) {
    e.preventDefault()
    f[f.length - 1].focus()
  } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
    e.preventDefault()
    f[0].focus()
  }
}
