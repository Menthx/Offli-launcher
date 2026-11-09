import { onBeforeUnmount, ref, watch } from 'vue'

/** Current time, refreshed every `ms` while `active` (running session timer) */
export function useNow(active: () => boolean, ms = 15_000) {
  const now = ref(Date.now())
  let id = 0
  const stop = (): void => window.clearInterval(id)
  watch(
    active,
    (on) => {
      stop()
      if (!on) return
      now.value = Date.now()
      id = window.setInterval(() => (now.value = Date.now()), ms)
    },
    { immediate: true }
  )
  onBeforeUnmount(stop)
  return now
}
