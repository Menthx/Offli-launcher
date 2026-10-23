import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import { linkKind } from '../../../../shared/links'
import type { DetectedLink, GameJournal, GameLink, LinkKind } from '../../../../shared/types'
import { Icon, type IconName } from '../../components/icons'
import { LinkForm } from './LinkForm'

const KIND_ICON: Record<LinkKind, IconName> = { server: 'chat', channel: 'hash', wiki: 'book', site: 'external' }

interface Row {
  url: string
  /** Name given by the player, offli.md or a shortcut (default label otherwise) */
  name?: string
  kind: LinkKind
  /** File it was found in, for detected links */
  file?: string
}

/** Host and path without the scheme, as people write it */
const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
const toLink = (url: string, label: string): GameLink => (label ? { url, label } : { url })

/** Creator's Discord, game channel, wiki: added by the player, or found in offli.md and the game's text files */
export function CommunityLinks(p: {
  journal: GameJournal | undefined
  detected: DetectedLink[]
  onSave(next: GameJournal): void
}): React.JSX.Element {
  // 'new', or the URL of the link being edited
  const [editing, setEditing] = useState<string>()
  const j = p.journal
  const own = new Set(j?.links.map((l) => l.url))
  const rows: Row[] = [
    ...(j?.links ?? []).map((l) => ({ url: l.url, name: l.label, kind: linkKind(l.url, l.label) })),
    ...p.detected
      .filter((d) => !own.has(d.url) && !j?.hiddenLinks.includes(d.url))
      .map((d) => ({ url: d.url, name: d.label, kind: linkKind(d.url, d.label), file: d.file }))
  ]
  const hide = (url: string): string[] => (j!.hiddenLinks.includes(url) ? j!.hiddenLinks : [...j!.hiddenLinks, url])
  const remove = (row: Row): void => {
    if (!j) return
    p.onSave(
      row.file ? { ...j, hiddenLinks: hide(row.url) } : { ...j, links: j.links.filter((l) => l.url !== row.url) }
    )
  }
  // An edited detected link becomes the player's own, and the found one is hidden
  const replace = (row: Row, link: GameLink): void => {
    if (!j) return
    const links = j.links.filter((l) => l.url !== link.url || l.url === row.url)
    if (row.file) p.onSave({ ...j, links: [...links, link], hiddenLinks: hide(row.url) })
    else p.onSave({ ...j, links: links.map((l) => (l.url === row.url ? link : l)) })
  }
  return (
    <section className="gp-box community" aria-labelledby="community-title">
      <header className="gp-box__head">
        <h5 id="community-title">{t('journal.community')}</h5>
      </header>
      {j && rows.length === 0 && !editing && <p className="muted">{t('journal.noLinks')}</p>}
      {rows.length > 0 && (
        <ul className="links">
          {rows.map((row) => {
            const label = row.name ?? t(`journal.${row.kind}`)
            if (editing === row.url)
              return (
                <li key={row.url}>
                  <LinkForm
                    initial={{ url: row.url, label: row.name ?? '' }}
                    onClose={() => setEditing(undefined)}
                    onSubmit={(url, name) => {
                      setEditing(undefined)
                      replace(row, toLink(url, name))
                    }}
                  />
                </li>
              )
            return (
              <li key={row.url} className={`com-link com-link--${row.kind}`}>
                <button className="link__open" onClick={() => void window.offli.openLink(row.url)}>
                  <span className="link__icon">
                    <Icon name={KIND_ICON[row.kind]} size={18} />
                  </span>
                  <span className="link__text">
                    <span className="link__label">{label}</span>
                    <small>{row.file ? t('journal.foundIn', { file: row.file }) : shortUrl(row.url)}</small>
                  </span>
                  <Icon name="external" size={14} />
                </button>
                <span className="link__tools">
                  <button
                    className="icon-btn"
                    onClick={() => setEditing(row.url)}
                    aria-label={t('journal.editLink', { name: label })}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => remove(row)}
                    aria-label={t('journal.removeLink', { name: label })}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {editing === 'new' ? (
        <LinkForm
          onClose={() => setEditing(undefined)}
          onSubmit={(url, name) => {
            setEditing(undefined)
            if (j && !own.has(url)) p.onSave({ ...j, links: [...j.links, toLink(url, name)] })
          }}
        />
      ) : (
        <button className="text-btn" onClick={() => setEditing('new')} disabled={!j}>
          <Icon name="plus" size={14} />
          {t('journal.addLink')}
        </button>
      )}
    </section>
  )
}
