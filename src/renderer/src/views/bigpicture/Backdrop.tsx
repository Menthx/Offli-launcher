import { useEffect, useRef, useState } from 'react'

interface Layer {
  id: string
  url: string
  /** Wide image (title screen): full bleed; otherwise blurred backdrop + art on the right */
  wide: boolean
  /** Small image: scaled up without smoothing */
  pixel: boolean
}

/** New layer fades in over the previous one, so switching games never flashes */
export function Backdrop({ id, url }: { id: string; url: string | null }): React.JSX.Element {
  const [layers, setLayers] = useState<Layer[]>([])
  const wanted = useRef(url)
  wanted.current = url

  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => {
      // Ignore images that arrive after the game changed
      if (wanted.current !== url) return
      const layer = {
        id,
        url,
        wide: img.naturalWidth > img.naturalHeight * 1.2,
        pixel: img.naturalWidth <= 128
      }
      setLayers((ls) => [...ls.filter((l) => l.id !== id).slice(-1), layer])
    }
    img.src = url
  }, [id, url])

  return (
    <div className="bp-backdrop" aria-hidden="true">
      {layers.map((l) => (
        <div
          key={l.id}
          className={`bp-layer ${l.wide ? 'bp-layer--wide' : 'bp-layer--art'} ${l.pixel ? 'is-pixel' : ''}`}
        >
          <img className="bp-layer__bg" src={l.url} alt="" draggable={false} />
          {!l.wide && <img className="bp-layer__art" src={l.url} alt="" draggable={false} />}
        </div>
      ))}
    </div>
  )
}
