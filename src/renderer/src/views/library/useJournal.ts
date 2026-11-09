import { shallowRef, watch } from 'vue'
import type { DetectedLink, GameJournal } from '../../../../shared/types'

/** Journal of the game on screen; each change is saved right away */
export function useJournal(id: () => string) {
  const journal = shallowRef<GameJournal>()
  const detected = shallowRef<DetectedLink[]>([])
  watch(
    id,
    (gameId, _old, onCleanup) => {
      // Another game: nothing shown until its own journal arrives
      let live = true
      journal.value = undefined
      detected.value = []
      void window.offli.getJournal(gameId).then((j) => live && (journal.value = j))
      void window.offli.detectLinks(gameId).then((d) => live && (detected.value = d))
      onCleanup(() => (live = false))
    },
    { immediate: true }
  )
  const save = (next: GameJournal): void => {
    journal.value = next
    void window.offli.saveJournal(id(), next)
  }
  return { journal, detected, save }
}
