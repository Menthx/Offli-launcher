import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Game, Settings } from '../../../shared/types'
import { t } from '../../../shared/i18n'
import { TOUR_STEPS, stepTitle, tourReduce } from '../tour'
import { PAD, type Rect, bubbleStyle, targetRect, trapFocus } from './tour/geometry'
import { TourBody, TourLogo } from './tour/TourBody'

interface Props {
  settings: Settings
  games: Game[]
  scanning: boolean
  selectedId: string | undefined
  onSelect(id: string | undefined): void
  onSave(patch: Partial<Settings>): Promise<void>
  /** The caller saves tutorialDone */
  onClose(): void
}

/** Six steps: centered dialogs or bubbles next to highlighted elements */
export function Tour({ settings, games, scanning, selectedId, onSelect, onSave, onClose }: Props): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  // Real bubble height, to keep it fully on screen
  const [cardH, setCardH] = useState(300)
  const dialog = useRef<HTMLDivElement>(null)
  const primary = useRef<HTMLButtonElement>(null)
  // Selection before the 'detail' step, restored when leaving it
  const selectionBefore = useRef<{ saved: boolean; id: string | undefined }>({
    saved: false,
    id: undefined
  })
  const current = TOUR_STEPS[step]
  const last = step === TOUR_STEPS.length - 1

  const go = useCallback(
    (action: 'next' | 'back' | 'skip') => {
      const r = tourReduce(step, action)
      if ('done' in r) onClose()
      else setStep(r.step)
    },
    [step, onClose]
  )

  // 'detail' step: select the first game if none is selected
  useEffect(() => {
    const sb = selectionBefore.current
    if (current.id === 'detail') {
      if (!sb.saved) {
        sb.saved = true
        sb.id = selectedId
        if (!selectedId) {
          const first = games.find((g) => g.kind !== 'baserom')
          if (first) onSelect(first.id)
        }
      }
    } else if (sb.saved) {
      sb.saved = false
      if (sb.id !== selectedId) onSelect(sb.id)
    }
  }, [current.id])

  // Highlight position, measured again on resize
  useLayoutEffect(() => {
    if (current.kind !== 'spotlight' || !current.target) {
      setRect(null)
      return
    }
    const target = current.target
    let frame = 0
    const measure = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setRect(targetRect(target)))
    }
    measure()
    // The game sheet may animate in: measure again once it's done
    const late = window.setTimeout(measure, 450)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [current, selectedId])

  useLayoutEffect(() => {
    if (dialog.current) setCardH(dialog.current.offsetHeight)
  }, [step, rect])

  useEffect(() => {
    primary.current?.focus()
  }, [step])

  // Esc skips, Enter or → goes next, ← goes back; focus is trapped
  const onKeyDown = (e: React.KeyboardEvent): void => {
    const onControl = (e.target as HTMLElement).closest('button, input, select')
    if (e.key === 'Escape') {
      e.preventDefault()
      go('skip')
    } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onControl)) {
      e.preventDefault()
      go('next')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go('back')
    } else if (e.key === 'Tab' && dialog.current) {
      trapFocus(e, dialog.current)
    }
  }

  // Nothing to highlight yet (no folder, no game): show the step as a centered dialog
  const spotlight = current.kind === 'spotlight' && !!rect

  return (
    <div className={`tour ${spotlight ? 'is-spotlight' : 'is-modal'}`} onKeyDown={onKeyDown}>
      {spotlight && rect ? (
        <div
          className="tour-ring"
          aria-hidden="true"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2
          }}
        />
      ) : (
        <div className="tour-scrim" aria-hidden="true" />
      )}
      <div
        ref={dialog}
        className={`tour-card ${spotlight ? `bubble side-${current.side}` : 'modal-card'}`}
        style={spotlight && rect ? bubbleStyle(rect, current.side, cardH) : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {current.id === 'welcome' && <TourLogo />}
        <p className="tour-step">{t('tour.step', { n: step + 1, total: TOUR_STEPS.length })}</p>
        <h2 id="tour-title">{stepTitle(current)}</h2>
        <TourBody step={current.id} settings={settings} games={games} scanning={scanning} onSave={onSave} />
        <div className="tour-foot">
          <span className="tour-dots" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => (
              <span key={s.id} className={`tour-dot ${i === step ? 'on' : ''}`} />
            ))}
          </span>
          <span className="tour-actions">
            {step === 0 ? (
              <button className="ghost" onClick={() => go('skip')}>
                {t('tour.skipTour')}
              </button>
            ) : (
              <>
                <button className="ghost" onClick={() => go('skip')}>
                  {t('tour.skip')}
                </button>
                <button className="ghost" onClick={() => go('back')} aria-label={t('tour.previous')}>
                  {t('tour.back')}
                </button>
              </>
            )}
            <button ref={primary} className="cta" onClick={() => go('next')}>
              {step === 0 ? t('tour.start') : last ? t('tour.done') : t('tour.next')}
            </button>
          </span>
        </div>
        {step === 0 && <p className="tour-hint">{t('tour.hint')}</p>}
        {/* Announces the step change to screen readers */}
        <p className="visually-hidden" aria-live="polite">
          {t('tour.stepAnnounce', {
            n: step + 1,
            total: TOUR_STEPS.length,
            title: stepTitle(current)
          })}
        </p>
      </div>
    </div>
  )
}
