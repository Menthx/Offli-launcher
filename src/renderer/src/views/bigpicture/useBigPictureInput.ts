import { onBeforeUnmount } from 'vue'

/** Standard gamepad layout (Xbox: A=0, B=1, X=2, Y=3) */
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LEFT: 14, RIGHT: 15 }
/** Repeat delay while the stick or an arrow is held */
const REPEAT_MS = 180

export interface BigPictureActions {
  move(delta: number): void
  /** LB / RB, Q / E, PageUp / PageDown */
  section(delta: number): void
  /** Y, S */
  sort(): void
  launch(): void
  favorite(): void
  exit(): void
}

/** Keyboard and gamepad, for as long as the calling component is shown */
export function useBigPictureInput(a: BigPictureActions): void {
  let lastMove = 0
  const onKey = (e: KeyboardEvent): void => {
    // A focused button keeps Enter for itself
    const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON'
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // Held key: step at a steady pace
      if (e.repeat && performance.now() - lastMove < REPEAT_MS) return e.preventDefault()
      lastMove = performance.now()
      a.move(e.key === 'ArrowRight' ? 1 : -1)
    } else if (e.key === 'PageUp' || e.key.toLowerCase() === 'q') a.section(-1)
    else if (e.key === 'PageDown' || e.key.toLowerCase() === 'e') a.section(1)
    else if (e.key.toLowerCase() === 's') a.sort()
    else if (e.key === 'Enter' && !onButton) a.launch()
    else if (e.key === 'f' || e.key === 'F') a.favorite()
    else if (e.key === 'Escape') a.exit()
    else return
    e.preventDefault()
  }
  window.addEventListener('keydown', onKey)

  // Gamepad: poll every frame and react to new presses
  let frame = 0
  const prev = new Set<number>()
  let lastAxisMove = 0
  const loop = (): void => {
    const pad = navigator.getGamepads().find((g) => g)
    if (pad) {
      const pressed = new Set(pad.buttons.flatMap((b, i) => (b.pressed ? [i] : [])))
      const hit = (b: number): boolean => pressed.has(b) && !prev.has(b)
      if (hit(BTN.RIGHT)) a.move(1)
      if (hit(BTN.LEFT)) a.move(-1)
      const x = pad.axes[0] ?? 0
      if (Math.abs(x) > 0.6 && performance.now() - lastAxisMove > REPEAT_MS) {
        a.move(x > 0 ? 1 : -1)
        lastAxisMove = performance.now()
      }
      if (hit(BTN.LB)) a.section(-1)
      if (hit(BTN.RB)) a.section(1)
      if (hit(BTN.Y)) a.sort()
      if (hit(BTN.A)) a.launch()
      if (hit(BTN.X)) a.favorite()
      if (hit(BTN.B)) a.exit()
      prev.clear()
      pressed.forEach((b) => prev.add(b))
    }
    frame = requestAnimationFrame(loop)
  }
  frame = requestAnimationFrame(loop)

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    cancelAnimationFrame(frame)
  })
}
