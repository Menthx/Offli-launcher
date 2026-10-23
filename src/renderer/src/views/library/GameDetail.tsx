import { useEffect, useRef } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game, GameStats } from '../../../../shared/types'
import { GameActions, type MenuAction } from '../../components/GameActions'
import { Icon } from '../../components/icons'
import { useNow } from '../../hooks/useNow'
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from '../../format'
import { steamGridDbAction } from '../../menuActions'
import { CommunityLinks } from './CommunityLinks'
import { GameFacts } from './GameFacts'
import { GameHero } from './GameHero'
import { Journal } from './Journal'
import { NameEditor } from './NameEditor'
import { useJournal } from './useJournal'

interface Props {
  game: Game
  stats: GameStats | undefined
  hasCustomCover: boolean
  hasSgdbKey: boolean
  onClose(): void
  onLaunch(game: Game): void
  onFavorite(game: Game): void
  onRename(game: Game, name: string | null): void
  onCoverChanged(id: string): void
  onPickSgdb(game: Game): void
  onHide(game: Game): void
  /** Picked version per game (newest by default) */
  picked: Record<string, string>
  /** Launch time of running games, by id */
  runningSince: Record<string, number>
  onPick(gameId: string, versionId: string): void
}

/** Game page (like Steam): banner with the name, Play bar, then journal, links and facts; replaces the grid until Back or Esc */
export function GameDetail(p: Props): React.JSX.Element {
  const sel = p.game
  const target = sel.versions?.find((v) => v.id === p.picked[sel.id]) ?? sel
  const since = p.runningSince[target.id]
  const onClose = useRef(p.onClose)
  onClose.current = p.onClose
  // Esc goes back to the library, unless a field, menu or dialog is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target instanceof HTMLElement ? e.target : null
      if (e.key === 'Escape' && !el?.closest("input, textarea, [role='menu'], [role='dialog'], [role='listbox']"))
        onClose.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const now = useNow(since !== undefined)
  // Notes and links belong to the game, whatever version is picked
  const { journal, detected, save } = useJournal(sel.id)

  const setCover = async (img: string | null): Promise<void> => {
    await window.offli.setCover(sel.id, img)
    p.onCoverChanged(sel.id)
  }
  const actions: MenuAction[] = [
    {
      label: t('detail.openFolder'),
      icon: <Icon name="folder" size={18} />,
      run: () => window.offli.openFolder(target.id)
    },
    {
      label: t('detail.changeImage'),
      icon: <Icon name="image" size={18} />,
      run: async () => {
        const img = await window.offli.pickFile('image')
        if (img) await setCover(img)
      }
    },
    steamGridDbAction(p.hasSgdbKey, <Icon name="grid" size={18} />, () => p.onPickSgdb(sel)),
    ...(p.hasCustomCover
      ? [
          {
            label: t('detail.resetImage'),
            icon: <Icon name="reset" size={18} />,
            run: () => setCover(null)
          }
        ]
      : []),
    {
      label: t('detail.hideGame'),
      icon: <Icon name="hide" size={18} />,
      run: () => p.onHide(sel),
      danger: true
    }
  ]

  return (
    <article className="game-page" aria-label={t('detail.sheetOf', { name: sel.name })}>
      <GameHero game={sel} onBack={p.onClose}>
        <span className="gp-kind">
          {kindLabel(sel)} · {PLATFORM_LABEL[sel.platform]}
        </span>
        <NameEditor game={sel} onRename={p.onRename} />
      </GameHero>
      <div className="gp-bar" data-tour="detail-actions">
        {since !== undefined ? (
          <button className="gp-play is-running" disabled aria-live="polite">
            <span className="run-dot" aria-hidden="true" />
            {t('common.running', { time: playtime(Math.max(0, Math.round((now - since) / 1000))) })}
          </button>
        ) : (
          <button className="gp-play" onClick={() => p.onLaunch(target)}>
            <Icon name="play" size={18} />
            {t('common.play')}
            <kbd aria-hidden="true">{t('common.keyEnter')}</kbd>
          </button>
        )}
        <dl className="gp-stats">
          <div>
            <dt>{t('detail.lastSession')}</dt>
            <dd>{lastPlayed(p.stats?.lastPlayed)}</dd>
          </div>
          <div>
            <dt>{t('detail.playtime')}</dt>
            <dd>{playtime(p.stats?.playtimeSec ?? 0)}</dd>
          </div>
        </dl>
        <GameActions
          gameId={sel.id}
          favorite={!!p.stats?.favorite}
          onFavorite={() => p.onFavorite(sel)}
          actions={actions}
        />
      </div>
      <div className="gp-columns">
        <Journal journal={journal} onSave={save} />
        <div className="gp-side">
          <CommunityLinks journal={journal} detected={detected} onSave={save} />
          <GameFacts game={sel} target={target} onPick={(id) => p.onPick(sel.id, id)} />
        </div>
      </div>
    </article>
  )
}
