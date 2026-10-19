/** DA tooltips: [data-tooltip="Text|Shortcut"], icon buttons fall back to aria-label; delayed on hover, instant on keyboard focus */
const MARGIN = 8

function tooltipOf(el: HTMLElement): string | undefined {
  if (el.dataset['tooltip']) return el.dataset['tooltip']
  const label = el.getAttribute('aria-label')
  return label && !el.textContent?.trim() ? label : undefined
}

function targetOf(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null
  const el = node.closest<HTMLElement>("[data-tooltip], button[aria-label]:not([role='switch'])")
  return el && tooltipOf(el) ? el : null
}

/** Returns a cleanup function */
export function installTooltips(): () => void {
  const css = (name: string, fallback: number): number =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback
  const tip = document.createElement('div')
  tip.className = 'tip'
  tip.id = 'tip'
  tip.setAttribute('role', 'tooltip')
  tip.hidden = true
  document.body.appendChild(tip)

  let target: HTMLElement | null = null
  let timer = 0

  const place = (el: HTMLElement): void => {
    const r = el.getBoundingClientRect()
    const t = tip.getBoundingClientRect()
    const offset = css('--tooltip-offset', 8)
    let side = 'top'
    let top = r.top - t.height - offset
    if (top < MARGIN) {
      side = 'bottom'
      top = r.bottom + offset
    }
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - MARGIN))
    tip.dataset['side'] = side
    tip.style.top = `${top}px`
    tip.style.left = `${left}px`
    tip.style.setProperty('--arrow-x', `${r.left + r.width / 2 - left}px`)
  }

  const show = (el: HTMLElement): void => {
    if (!el.isConnected) return
    const [text, kbd] = (tooltipOf(el) ?? '').split('|')
    tip.textContent = text
    if (kbd) tip.appendChild(Object.assign(document.createElement('kbd'), { textContent: kbd }))
    tip.hidden = false
    place(el)
    el.setAttribute('aria-describedby', 'tip')
    requestAnimationFrame(() => tip.classList.add('is-on'))
  }

  const hide = (): void => {
    clearTimeout(timer)
    tip.classList.remove('is-on')
    tip.hidden = true
    target?.removeAttribute('aria-describedby')
    target = null
  }

  const onOver = (e: PointerEvent): void => {
    const el = targetOf(e.target)
    if (el === target) return
    hide()
    if (!el) return
    target = el
    timer = window.setTimeout(() => show(el), css('--tooltip-delay', 400))
  }
  const onFocus = (e: FocusEvent): void => {
    const el = targetOf(e.target)
    hide()
    if (el?.matches(':focus-visible')) {
      target = el
      show(el)
    }
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') hide()
  }

  document.addEventListener('pointerover', onOver)
  document.addEventListener('focusin', onFocus)
  document.addEventListener('focusout', hide)
  document.addEventListener('pointerdown', hide)
  document.addEventListener('scroll', hide, true)
  document.addEventListener('keydown', onKey)
  return () => {
    hide()
    tip.remove()
    document.removeEventListener('pointerover', onOver)
    document.removeEventListener('focusin', onFocus)
    document.removeEventListener('focusout', hide)
    document.removeEventListener('pointerdown', hide)
    document.removeEventListener('scroll', hide, true)
    document.removeEventListener('keydown', onKey)
  }
}
