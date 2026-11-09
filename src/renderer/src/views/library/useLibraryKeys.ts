import { onBeforeUnmount } from 'vue'

/** Ctrl/Cmd+K focuses search; Enter launches the page's game unless a field or another button has focus */
export function useLibraryKeys(
  search: () => HTMLInputElement | null | undefined,
  launch: () => (() => void) | undefined
) {
  const onKey = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      search()?.focus()
      search()?.select()
      return
    }
    const run = launch()
    if (e.key !== 'Enter' || e.repeat || !run) return
    const el = e.target instanceof HTMLElement ? e.target : null
    const busy = el?.closest("input, textarea, select, [role='menu'], [role='dialog'], .lib-side")
    const otherControl = el?.closest('button, a') && !el.closest('.card.sel')
    if (busy || otherControl) return
    e.preventDefault()
    run()
  }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
