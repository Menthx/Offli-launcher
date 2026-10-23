/** First-launch tutorial steps and navigation, React-free (testable in Node) */
import { t } from '../../shared/i18n'

export type TourStepId = 'welcome' | 'folders' | 'sidebar' | 'detail' | 'settings' | 'bigpicture'

export interface TourStep {
  id: TourStepId
  /** Centered dialog, or a bubble next to a highlighted [data-tour] element */
  kind: 'modal' | 'spotlight'
  target?: string
  side?: 'right' | 'left' | 'top'
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', kind: 'modal' },
  { id: 'folders', kind: 'modal' },
  { id: 'sidebar', kind: 'spotlight', target: 'sidebar', side: 'right' },
  { id: 'detail', kind: 'spotlight', target: 'detail-actions', side: 'top' },
  { id: 'settings', kind: 'spotlight', target: 'settings', side: 'right' },
  { id: 'bigpicture', kind: 'modal' }
]

export const stepTitle = (step: TourStep): string => t(`tour.${step.id}`)

export type TourAction = 'next' | 'back' | 'skip'

export type TourResult = { step: number } | { done: 'finished' | 'skipped' }

export function tourReduce(step: number, action: TourAction, count = TOUR_STEPS.length): TourResult {
  if (action === 'skip') return { done: 'skipped' }
  if (action === 'back') return { step: Math.max(0, step - 1) }
  return step >= count - 1 ? { done: 'finished' } : { step: step + 1 }
}

/** Auto-opens until finished or skipped, even without a folder (step 2 picks the first one) */
export function shouldAutoStartTour(settings: { tutorialDone: boolean }): boolean {
  return !settings.tutorialDone
}

/** Status line of the 'Where are your games?' step */
export function libraryStatus(games: { kind: string }[]): string {
  const fangames = games.filter((g) => g.kind === 'fangame').length
  const roms = games.length - fangames
  return `${t('folders.gamesFound', { n: games.length })} · ${t('folders.fangames', { n: fangames })}, ${t('folders.roms', { n: roms })}`
}
