import { useEffect, useState } from 'react'
import type { Game } from '../../../shared/types'
import { PLATFORM_LABEL } from '../format'

const cache = new Map<string, Promise<string | null>>()
const changes = new EventTarget()

/** Oublie une jaquette (ou toutes) : les composants concernés la redemandent */
export function forgetCover(id?: string): void {
  if (id) cache.delete(id)
  else cache.clear()
  changes.dispatchEvent(new Event('change'))
}

export function useCover(id: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const [epoch, setEpoch] = useState(0)
  useEffect(() => {
    const bump = (): void => setEpoch((e) => e + 1)
    changes.addEventListener('change', bump)
    return () => changes.removeEventListener('change', bump)
  }, [])
  useEffect(() => {
    let alive = true
    let p = cache.get(id)
    if (!p) {
      p = window.offli.resolveCover(id)
      cache.set(id, p)
    }
    p.then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [id, epoch])
  return url
}

/** Jaquette du jeu, ou un emplacement vide avec le nom si aucune image n'est trouvée */
export function Cover({ game, wide = false }: { game: Game; wide?: boolean }): React.JSX.Element {
  const url = useCover(game.id)
  const [pixel, setPixel] = useState(false)
  // Jaquette de romhack : affichée entière et centrée, sur un fond flouté de la même image
  const fit = game.kind === 'romhack' && !pixel
  return (
    <div className={`cover ${wide ? 'wide' : ''} ${url ? '' : 'empty'} ${url && fit ? 'fit' : ''}`}>
      {url && fit && <img src={url} alt="" aria-hidden="true" draggable={false} className="backdrop" />}
      {url ? <img
          src={url}
          alt=""
          loading="lazy"
          draggable={false}
          className={pixel ? 'main pixel' : 'main'}
          // Les petites icônes (NDS 32×32) restent nettes et entières
          onLoad={(e) => setPixel(e.currentTarget.naturalWidth <= 64)}
        /> : <span className="cover-name">{game.name}</span>}
      <span className={`badge ${game.kind === 'fangame' ? 'fan' : 'rom'}`}>{PLATFORM_LABEL[game.platform]}</span>
    </div>
  )
}
