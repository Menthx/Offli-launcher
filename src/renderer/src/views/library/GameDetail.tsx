import { useEffect, useRef } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game, GameStats } from '../../../../shared/types'
import { GameActions, type MenuAction } from '../../components/GameActions'
import { Icon } from '../../components/icons'
import { Select } from '../../components/Select'
import { useNow } from '../../hooks/useNow'
import { PLATFORM_LABEL, baseGameName, kindLabel, lastPlayed, playtime } from '../../format'
import { steamGridDbAction } from '../../menuActions'
import { GameHero } from './GameHero'
import { NameEditor, PathSpoiler } from './NameEditor'

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

/** Game page (like Steam): banner with the name, Play bar, then facts; replaces the grid until Back or Esc */
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
      <section className="gp-info">
        <h5>{t('detail.info')}</h5>
        <dl className="facts">
          {sel.versions && (
            <>
              <dt>
                <label htmlFor="version-select">{t('detail.version')}</label>
              </dt>
              <dd>
                <Select
                  id="version-select"
                  className="select--sm"
                  value={target.id}
                  onChange={(id) => p.onPick(sel.id, id)}
                  options={sel.versions.map((v, i) => ({
                    value: v.id,
                    label: (v.variant ?? v.name) + (i === 0 ? t('detail.latest') : '')
                  }))}
                />
              </dd>
            </>
          )}
          <dt>{t('detail.type')}</dt>
          <dd>
            {kindLabel(sel)} · {PLATFORM_LABEL[sel.platform]}
          </dd>
          {sel.kind !== 'fangame' && (
            <>
              <dt>{t('detail.base')}</dt>
              <dd>{sel.baseRom ? `${baseGameName(sel.baseRom)} (${sel.baseRom.code})` : t('detail.unknownBase')}</dd>
            </>
          )}
          {/* Last: the revealed path may wrap without moving anything below */}
          <dt>{t('detail.file')}</dt>
          <dd>
            <PathSpoiler key={target.id} path={target.path} />
          </dd>
        </dl>
      </section>
    </article>
  )
}
