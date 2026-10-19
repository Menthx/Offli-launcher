import { useEffect, useRef, useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game } from '../../../../shared/types'
import { Icon } from '../../components/icons'

/** Click to rename: Enter saves, Esc cancels, empty restores the detected name */
export function NameEditor({
  game,
  onRename
}: {
  game: Game
  onRename(game: Game, name: string | null): void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(game.name)
  const cancelled = useRef(false)

  useEffect(() => setEditing(false), [game.id])

  const start = (): void => {
    cancelled.current = false
    setDraft(game.name)
    setEditing(true)
  }
  const commit = (): void => {
    setEditing(false)
    if (cancelled.current) return
    const name = draft.trim()
    if (name === game.name) return
    const original = game.originalName ?? game.name
    onRename(game, !name || name === original ? null : name)
  }

  return (
    <div className="name-editor">
      {editing ? (
        <input
          className="name-input"
          aria-label={t('detail.gameName')}
          autoFocus
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              cancelled.current = true
              e.currentTarget.blur()
            }
          }}
        />
      ) : (
        <h3>
          <button className="name-btn" onClick={start} data-tooltip={t('detail.rename')}>
            {game.name}
            <Icon name="pencil" size={14} />
          </button>
        </h3>
      )}
      {game.originalName && (
        <p className="muted">
          {t('detail.originalName', { name: game.originalName })} ·{' '}
          <button className="link" onClick={() => onRename(game, null)}>
            {t('detail.restore')}
          </button>
        </p>
      )}
    </div>
  )
}

/** Hidden until revealed (not in the DOM nor a tooltip); keyed by game so it hides again on change */
export function PathSpoiler({ path }: { path: string }): React.JSX.Element {
  const [shown, setShown] = useState(false)
  if (!shown) {
    return (
      <button
        className="spoiler"
        onClick={() => setShown(true)}
        aria-label={t('detail.showPath')}
        aria-expanded={false}
      >
        <span className="spoiler-blur" aria-hidden="true">
          ████████ ██████ ███████████
        </span>
        <span className="spoiler-hint" aria-hidden="true">
          {t('common.show')}
        </span>
      </button>
    )
  }
  return (
    <span className="spoiler-shown">
      {path}{' '}
      <button className="link" onClick={() => setShown(false)} aria-label={t('detail.hidePath')} aria-expanded={true}>
        {t('detail.hide')}
      </button>
    </span>
  )
}
