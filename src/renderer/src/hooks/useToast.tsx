import { useCallback, useRef, useState } from 'react'

export interface Toast {
  text: string
  error?: boolean
}

/** Bottom toast: 2.5 s, or 5 s for errors */
export function useToast(): [Toast | null, (t: Toast) => void] {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(undefined)
  const notify = useCallback((t: Toast) => {
    setToast(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), t.error ? 5000 : 2500)
  }, [])
  return [toast, notify]
}

export function ToastView({ toast }: { toast: Toast | null }): React.JSX.Element {
  return (
    <div className={`toast ${toast ? 'show' : ''} ${toast?.error ? 'error' : ''}`} role="status" aria-live="polite">
      {toast && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={
              toast.error
                ? 'M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'
                : 'M5 12.5l4.5 4.5L19 7.5'
            }
          />
        </svg>
      )}
      <span>{toast?.text}</span>
    </div>
  )
}
