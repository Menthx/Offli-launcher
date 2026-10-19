import { useEffect, useRef, useState } from 'react'
import { t } from '../../../shared/i18n'
import type { Game, SgdbImage, SgdbResult } from '../../../shared/types'
import { Icon } from './icons'
import { Select } from './Select'

interface Props {
  game: Game
  onClose(): void
  onPicked(): void
}

type Status = 'idle' | 'loading' | 'error-key' | 'error-network'

const MESSAGES = {
  'error-key': 'sgdb.errorKey',
  'error-network': 'sgdb.errorNetwork'
} as const

/** SteamGridDB cover picker; every call goes through the main process */
export function SgdbPicker({ game, onClose, onPicked }: Props): React.JSX.Element {
  const [term, setTerm] = useState(game.originalName ?? game.name)
  const [matches, setMatches] = useState<{ id: number; name: string; year?: number }[]>([])
  const [sgdbId, setSgdbId] = useState<number>()
  const [images, setImages] = useState<SgdbImage[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [picking, setPicking] = useState<number>()
  const dialog = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)

  const fail = (r: SgdbResult<unknown>): boolean => {
    if (r.ok) return false
    setStatus(r.error === 'unauthorized' ? 'error-key' : 'error-network')
    return true
  }

  const loadGrids = async (id: number, p: number): Promise<void> => {
    setStatus('loading')
    const r = await window.offli.sgdbGrids(id, p)
    if (fail(r) || !r.ok) return
    setImages((prev) => (p === 0 ? r.value.images : [...prev, ...r.value.images]))
    setHasMore(r.value.hasMore)
    setPage(p)
    setStatus('idle')
  }

  const search = async (q: string): Promise<void> => {
    setStatus('loading')
    setImages([])
    setHasMore(false)
    const r = await window.offli.sgdbSearch(q)
    if (fail(r) || !r.ok) return
    setMatches(r.value)
    setSgdbId(r.value[0]?.id)
    if (r.value[0]) await loadGrids(r.value[0].id, 0)
    else setStatus('idle')
  }

  // Search once on open; focus returns to the opener on close
  useEffect(() => {
    void search(term)
    const back = opener.current
    return () => (back as HTMLElement | null)?.focus?.()
  }, [])

  // Focus trap, Esc closes
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialog.current) return
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, select')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  const pick = async (img: SgdbImage): Promise<void> => {
    setPicking(img.id)
    const r = await window.offli.sgdbPick(game.id, img.id)
    setPicking(undefined)
    if (fail(r)) return
    onPicked()
    onClose()
  }

  const loading = status === 'loading'

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        ref={dialog}
        className="modal sgdb"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sgdb-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="modal-head">
          <h2 id="sgdb-title">{t('sgdb.title')}</h2>
          <button className="round-close" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={14} />
          </button>
        </header>

        <form
          className="sgdb-search"
          onSubmit={(e) => {
            e.preventDefault()
            void search(term)
          }}
        >
          <label htmlFor="sgdb-term" className="visually-hidden">
            {t('sgdb.termLabel')}
          </label>
          <input id="sgdb-term" value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
          <button className="ghost" type="submit" disabled={loading || !term.trim()}>
            {t('sgdb.search')}
          </button>
        </form>

        {matches.length > 1 && (
          <div className="field field-inline">
            <label htmlFor="sgdb-game">{t('sgdb.game')}</label>
            <Select
              id="sgdb-game"
              value={String(sgdbId)}
              onChange={(v) => {
                setSgdbId(Number(v))
                void loadGrids(Number(v), 0)
              }}
              options={matches.map((m) => ({
                value: String(m.id),
                label: m.name + (m.year ? ` (${m.year})` : '')
              }))}
            />
          </div>
        )}

        {/* Fixed height so the dialog doesn't resize while loading */}
        <div className="sgdb-results" aria-busy={loading}>
          {status === 'error-key' || status === 'error-network' ? (
            <p className="sgdb-message" role="alert">
              {t(MESSAGES[status])}
            </p>
          ) : !loading && images.length === 0 ? (
            <p className="sgdb-message">{matches.length === 0 ? t('sgdb.notFound') : t('sgdb.noImages')}</p>
          ) : (
            <div className="sgdb-grid">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  className="sgdb-thumb"
                  aria-label={t(hasMore ? 'sgdb.thumbMore' : 'sgdb.thumb', {
                    i: i + 1,
                    n: images.length
                  })}
                  disabled={picking !== undefined}
                  onClick={() => void pick(img)}
                >
                  <img src={img.thumb} alt="" loading="lazy" draggable={false} />
                  {picking === img.id && <span className="sgdb-picking">{t('sgdb.downloading')}</span>}
                </button>
              ))}
            </div>
          )}
          {loading && (
            <p className="sgdb-message" role="status">
              {t('common.loading')}
            </p>
          )}
        </div>

        <footer className="sgdb-foot">
          {hasMore && sgdbId !== undefined && (
            <button className="ghost" disabled={loading} onClick={() => void loadGrids(sgdbId, page + 1)}>
              {t('sgdb.more')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
