import { ref, shallowRef, watchEffect } from 'vue'
import type { CoverSize } from '../../../shared/types'

const cache = new Map<string, Promise<string | null>>()
/** Bumped when covers are forgotten: components showing one request it again */
const epoch = ref(0)

export function forgetCover(id?: string): void {
  for (const key of [...cache.keys()]) if (!id || key.startsWith(`${id}:`)) cache.delete(key)
  epoch.value++
}

/** Cover URL of a game (null while loading or when there is none) */
export function useCover(id: () => string, size: () => CoverSize = () => 'full') {
  const url = shallowRef<string | null>(null)
  watchEffect((onCleanup) => {
    void epoch.value
    let alive = true
    const key = `${id()}:${size()}`
    let p = cache.get(key)
    if (!p) {
      p = window.offli.resolveCover(id(), size())
      cache.set(key, p)
    }
    void p.then((u) => alive && (url.value = u))
    onCleanup(() => (alive = false))
  })
  return url
}

/** The main process marks logos and other see-through images: shown whole, never cropped */
export const isFitUrl = (url: string): boolean => new URL(url).searchParams.has('fit')
