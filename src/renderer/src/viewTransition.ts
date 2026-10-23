import { flushSync } from 'react-dom'

/** Library animations with the View Transitions API; applied instantly without the API or with reduced motion */

type StartViewTransition = (update: () => void) => { finished: Promise<void> }

function startViewTransition(): StartViewTransition | undefined {
  const doc = document as Document & {
    startViewTransition?: StartViewTransition
  }
  if (!doc.startViewTransition) return undefined
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
  return doc.startViewTransition.bind(doc)
}

export function animate(update: () => void): void {
  const start = startViewTransition()
  if (!start) {
    update()
    return
  }
  start(() => flushSync(update))
}

const HERO = 'hero-cover'

/** Card cover in the main grid (not in 'Recently played') */
function cardCover(id: string | undefined): HTMLElement | null {
  if (!id) return null
  return document.querySelector<HTMLElement>(`.lib-main .grid .card[data-game="${CSS.escape(id)}"] .cover`)
}

function detailCover(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.game-page .gp-hero__art')
}

function name(el: HTMLElement | null, value: string): void {
  if (el) el.style.setProperty('view-transition-name', value)
}

/** Shared-element transition between the card cover and the game page banner; the transition name is set only during the animation */
export function animateSelection(fromId: string | undefined, toId: string | undefined, apply: () => void): void {
  const start = startViewTransition()
  if (!start || fromId === toId) {
    apply()
    return
  }
  // Before: the clicked card (open, switch) or the page banner (close)
  const before = toId ? cardCover(toId) : detailCover()
  name(before, HERO)
  let after: HTMLElement | null = null
  const transition = start(() => {
    flushSync(apply)
    name(before, '')
    // After: the banner art, or the card of the game just closed
    after = toId ? detailCover() : cardCover(fromId)
    name(after, HERO)
  })
  void transition.finished.finally(() => {
    name(before, '')
    name(after, '')
  })
}
