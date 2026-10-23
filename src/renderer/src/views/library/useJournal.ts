import { useEffect, useState } from 'react'
import type { DetectedLink, GameJournal } from '../../../../shared/types'

/** Journal of the game on screen; each change is saved right away */
export function useJournal(id: string): {
  journal: GameJournal | undefined
  detected: DetectedLink[]
  save(next: GameJournal): void
} {
  const [state, setState] = useState<{ id: string; journal?: GameJournal; detected: DetectedLink[] }>({
    id,
    detected: []
  })
  useEffect(() => {
    let live = true
    void window.offli.getJournal(id).then((journal) => live && setState((s) => (s.id === id ? { ...s, journal } : s)))
    void window.offli
      .detectLinks(id)
      .then((detected) => live && setState((s) => (s.id === id ? { ...s, detected } : s)))
    return () => {
      live = false
    }
  }, [id])
  // Another game: nothing shown until its own journal arrives
  if (state.id !== id) setState({ id, detected: [] })
  return {
    journal: state.id === id ? state.journal : undefined,
    detected: state.id === id ? state.detected : [],
    save: (journal) => {
      setState((s) => ({ ...s, journal }))
      void window.offli.saveJournal(id, journal)
    }
  }
}
