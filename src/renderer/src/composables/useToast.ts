import { ref } from 'vue'

export interface Toast {
  text: string
  error?: boolean
}

/** Bottom toast: 2.5 s, or 5 s for errors */
export function useToast() {
  const toast = ref<Toast | null>(null)
  let timer = 0
  const notify = (t: Toast): void => {
    toast.value = t
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (toast.value = null), t.error ? 5000 : 2500)
  }
  return { toast, notify }
}
