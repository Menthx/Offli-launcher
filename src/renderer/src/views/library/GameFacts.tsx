import { t } from '../../../../shared/i18n'
import type { Game } from '../../../../shared/types'
import { Select } from '../../components/Select'
import { PLATFORM_LABEL, baseGameName, kindLabel } from '../../format'
import { PathSpoiler } from './NameEditor'

/** Version picker, type, base ROM and hidden file path */
export function GameFacts(p: { game: Game; target: Game; onPick(versionId: string): void }): React.JSX.Element {
  const { game, target } = p
  return (
    <section className="gp-box gp-info" aria-labelledby="info-title">
      <header className="gp-box__head">
        <h5 id="info-title">{t('detail.info')}</h5>
      </header>
      <dl className="facts">
        {game.versions && (
          <>
            <dt>
              <label htmlFor="version-select">{t('detail.version')}</label>
            </dt>
            <dd>
              <Select
                id="version-select"
                className="select--sm"
                value={target.id}
                onChange={(id) => p.onPick(id)}
                options={game.versions.map((v, i) => ({
                  value: v.id,
                  label: (v.variant ?? v.name) + (i === 0 ? t('detail.latest') : '')
                }))}
              />
            </dd>
          </>
        )}
        <dt>{t('detail.type')}</dt>
        <dd>
          {kindLabel(game)} · {PLATFORM_LABEL[game.platform]}
        </dd>
        {game.kind !== 'fangame' && (
          <>
            <dt>{t('detail.base')}</dt>
            <dd>{game.baseRom ? `${baseGameName(game.baseRom)} (${game.baseRom.code})` : t('detail.unknownBase')}</dd>
          </>
        )}
        {/* Last: the revealed path may wrap without moving anything below */}
        <dt>{t('detail.file')}</dt>
        <dd>
          <PathSpoiler key={target.id} path={target.path} />
        </dd>
      </dl>
    </section>
  )
}
