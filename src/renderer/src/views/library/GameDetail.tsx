import { useEffect, useRef } from 'react'
import { t } from '../../../../shared/i18n'
import type { Game, GameStats } from '../../../../shared/types'
import { Cover } from '../../components/Cover'
import { GameActions, type MenuAction } from '../../components/GameActions'
import { Icon } from '../../components/icons'
import { Select } from '../../components/Select'
import { useNow } from '../../hooks/useNow'
import { PLATFORM_LABEL, baseGameName, kindLabel, lastPlayed, playtime } from '../../format'
import { steamGridDbAction } from '../../menuActions'
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

/** Cover, name, Play, actions and facts of the selected game */
export function GameDetail(p: Props): React.JSX.Element {
  const sel = p.game
  const target = sel.versions?.find((v) => v.id === p.picked[sel.id]) ?? sel
  const since = p.runningSince[target.id]
  const sheet = useRef<HTMLElement>(null)
  // A sheet opening below the visible area scrolls into view
  useEffect(() => sheet.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [sel.id])
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
    <aside ref={sheet} className="lib-detail" aria-label={t('detail.sheetOf', { name: sel.name })}>
      <button
        className="close-detail"
        onClick={p.onClose}
        aria-label={t('detail.closeSheet')}
        data-tooltip={`${t('detail.closeSheet')}|${t('common.keyEsc')}`}
      >
        <Icon name="close" size={14} />
      </button>
      <Cover game={sel} />
      <NameEditor game={sel} onRename={p.onRename} />
      {/* Facts as pills: label muted, value bright */}
      <dl className="pills">
        <div className="pill">
          <dt className="visually-hidden">{t('detail.type')}</dt>
          <dd>
            {kindLabel(sel)} · {PLATFORM_LABEL[sel.platform]}
          </dd>
        </div>
        {sel.kind !== 'fangame' && (
          <div className="pill">
            <dt>{t('detail.base')}</dt>
            <dd>{sel.baseRom ? `${baseGameName(sel.baseRom)} (${sel.baseRom.code})` : t('detail.unknownBase')}</dd>
          </div>
        )}
        <div className="pill">
          <dt>{t('detail.lastSession')}</dt>
          <dd>{lastPlayed(p.stats?.lastPlayed)}</dd>
        </div>
        <div className="pill">
          <dt>{t('detail.playtime')}</dt>
          <dd>{playtime(p.stats?.playtimeSec ?? 0)}</dd>
        </div>
        {sel.versions && (
          <div className="pill pill--select">
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
          </div>
        )}
      </dl>
      <div className="detail-actions">
        {/* Inset rail: raised Play, flat favorite and menu (DA minimal variant) */}
        <div className="play-rail" data-tour="detail-actions">
          {since !== undefined ? (
            <button className="play-main is-running" disabled aria-live="polite">
              <span className="run-dot" aria-hidden="true" />
              <span className="play-main__label">
                {t('common.running', {
                  time: playtime(Math.max(0, Math.round((now - since) / 1000)))
                })}
              </span>
            </button>
          ) : (
            <button className="play-main" onClick={() => p.onLaunch(target)}>
              <Icon name="play" size={16} />
              <span className="play-main__label">{t('common.play')}</span>
              <kbd aria-hidden="true">{t('common.keyEnter')}</kbd>
            </button>
          )}
          <GameActions
            gameId={sel.id}
            favorite={!!p.stats?.favorite}
            onFavorite={() => p.onFavorite(sel)}
            actions={actions}
          />
        </div>
        <div className="detail-file">
          <span>{t('detail.file')}</span>
          <PathSpoiler key={target.id} path={target.path} />
        </div>
      </div>
    </aside>
  )
}
