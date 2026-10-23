import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game } from '../../../../shared/types'
import { isFitUrl, useCover } from '../../components/Cover'

/** Banner: a wide title screen fills it; a cover, logo or icon sits whole on the right of a blurred copy */
export function GameHero({
  game,
  onBack,
  children
}: {
  game: Game
  onBack(): void
  children: React.ReactNode
}): React.JSX.Element {
  const url = useCover(game.id)
  const [wide, setWide] = useState<{ url: string; wide: boolean }>()
  const isWide = !!url && wide?.url === url && wide.wide
  return (
    <header className={`gp-hero ${isWide ? 'is-wide' : ''}`}>
      {url && <img className="gp-hero__bg" src={url} alt="" aria-hidden="true" draggable={false} />}
      {url && (
        <img
          className="gp-hero__art"
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            setWide({ url, wide: img.naturalWidth > img.naturalHeight * 1.2 && !isFitUrl(url) })
          }}
        />
      )}
      <button className="gp-back" onClick={onBack} aria-label={t('bp.backToLibrary')}>
        {t('bp.back')}
      </button>
      <div className="gp-title">{children}</div>
    </header>
  )
}
