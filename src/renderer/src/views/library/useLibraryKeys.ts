import { type RefObject, useEffect, useRef } from 'react'

/** Ctrl/Cmd+K focuses search; Enter launches the sheet's game unless a field or another button has focus */
export function useLibraryKeys(
  search: RefObject<HTMLInputElement | null>,
  launchSelected: (() => void) | undefined
): void {
  const launch = useRef(launchSelected)
  launch.current = launchSelected

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
        search.current?.select()
        return
      }
      if (e.key !== 'Enter' || e.repeat || !launch.current) return
      const el = e.target instanceof HTMLElement ? e.target : null
      const busy = el?.closest("input, textarea, select, [role='menu'], [role='dialog'], .lib-side")
      const otherControl = el?.closest('button, a') && !el.closest('.card.sel')
      if (busy || otherControl) return
      e.preventDefault()
      launch.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [search])
}
