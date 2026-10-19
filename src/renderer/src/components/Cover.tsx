import { useEffect, useState } from 'react'
import type { CoverSize, Game } from '../../../shared/types'
import { PLATFORM_LABEL } from '../format'

const cache = new Map<string, Promise<string | null>>()
const changes = new EventTarget()

/** Components showing it request it again */
export function forgetCover(id?: string): void {
  for (const key of [...cache.keys()]) if (!id || key.startsWith(`${id}:`)) cache.delete(key)
  changes.dispatchEvent(new Event('change'))
}

export function useCover(id: string, size: CoverSize = 'full'): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)
  useEffect(() => {
    const bump = (): void => setEpoch((e) => e + 1)
    changes.addEventListener('change', bump)
    return () => changes.removeEventListener('change', bump)
  }, [])
  useEffect(() => {
    let alive = true
    const key = `${id}:${size}`
    let p = cache.get(key)
    if (!p) {
      p = window.offli.resolveCover(id, size)
      cache.set(key, p)
    }
    p.then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [id, size, epoch])
  return url
}

/** Loaded image shape: cover art, square icon (Icon.png, .exe) or tiny pixel-art icon */
type Shape = 'cover' | 'icon' | 'pixel'

function shapeOf(img: HTMLImageElement): Shape {
  const { naturalWidth: w, naturalHeight: h } = img
  if (w <= 64) return 'pixel'
  return Math.abs(w - h) <= 2 ? 'icon' : 'cover'
}

/** Game cover, or an empty slot with the name when no image is found */
export function Cover({ game, wide = false }: { game: Game; wide?: boolean }): React.JSX.Element {
  const url = useCover(game.id, wide ? 'full' : 'thumb')
  // A new URL counts as 'cover' until it has loaded
  const [measured, setMeasured] = useState<{ url: string; shape: Shape }>()
  const shape = measured && measured.url === url ? measured.shape : 'cover'
  // Icons are centered on a blurred copy of themselves; romhack covers are shown whole
  const icon = shape !== 'cover'
  const fit = icon || game.kind !== 'fangame'
  const cls = ['cover', wide && 'wide', !url && 'empty', url && fit && 'fit', url && icon && 'icon']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      {url && fit && <img src={url} alt="" aria-hidden="true" draggable={false} className="backdrop" />}
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          className={shape === 'pixel' ? 'main pixel' : 'main'}
          onLoad={(e) => setMeasured({ url, shape: shapeOf(e.currentTarget) })}
        />
      ) : (
        <span className="cover-name">{game.name}</span>
      )}
      <span className={`badge ${game.kind === 'fangame' ? 'fan' : 'rom'}`}>{PLATFORM_LABEL[game.platform]}</span>
    </div>
  )
}
