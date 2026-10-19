import { useEffect, useState } from 'react'

/** Current time, refreshed every `ms` while `active` (running session timer) */
export function useNow(active: boolean, ms = 15_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [active, ms])
  return now
}
