import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import { linkKind, normalizeUrl } from '../../../../shared/links'
import type { DetectedLink, GameJournal, LinkKind } from '../../../../shared/types'
import { Icon, type IconName } from '../../components/icons'

const KIND_ICON: Record<LinkKind, IconName> = { server: 'chat', channel: 'hash', wiki: 'book', site: 'external' }

interface Row {
  url: string
  label: string
  /** File it was found in, for detected links */
  file?: string
}

/** Host and path without the scheme, as people write it */
const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

function AddLink({ onAdd, onClose }: { onAdd(url: string, label: string): void; onClose(): void }): React.JSX.Element {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [invalid, setInvalid] = useState(false)
  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    const clean = normalizeUrl(url)
    if (!clean) return setInvalid(true)
    onAdd(clean, label.trim())
  }
  return (
    <form className="link-form" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <input
        className="input"
        autoFocus
        value={url}
        placeholder="discord.gg/…"
        aria-label={t('journal.linkUrl')}
        aria-invalid={invalid}
        onChange={(e) => {
          setUrl(e.target.value)
          setInvalid(false)
        }}
      />
      <input
        className="input"
        value={label}
        placeholder={t('journal.linkLabel')}
        aria-label={t('journal.linkLabel')}
        onChange={(e) => setLabel(e.target.value)}
      />
      {invalid && (
        <p className="link-error" role="alert">
          {t('journal.linkInvalid')}
        </p>
      )}
      <div className="link-form__actions">
        <button type="button" className="ghost" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="cta">
          {t('journal.add')}
        </button>
      </div>
    </form>
  )
}

/** Creator's Discord, game channel, wiki: added by the player or found in the game's text files */
export function CommunityLinks(p: {
  journal: GameJournal | undefined
  detected: DetectedLink[]
  onSave(next: GameJournal): void
}): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const j = p.journal
  const own = new Set(j?.links.map((l) => l.url))
  const rows: Row[] = [
    ...(j?.links ?? []).map((l) => ({ url: l.url, label: l.label ?? t(`journal.${linkKind(l.url)}`) })),
    ...p.detected
      .filter((d) => !own.has(d.url) && !j?.hiddenLinks.includes(d.url))
      .map((d) => ({ url: d.url, label: t(`journal.${linkKind(d.url)}`), file: d.file }))
  ]
  const remove = (row: Row): void => {
    if (!j) return
    p.onSave(
      row.file
        ? { ...j, hiddenLinks: [...j.hiddenLinks, row.url] }
        : { ...j, links: j.links.filter((l) => l.url !== row.url) }
    )
  }
  return (
    <section className="gp-box community" aria-labelledby="community-title">
      <header className="gp-box__head">
        <h5 id="community-title">{t('journal.community')}</h5>
      </header>
      {j && rows.length === 0 && !adding && <p className="muted">{t('journal.noLinks')}</p>}
      {rows.length > 0 && (
        <ul className="links">
          {rows.map((row) => (
            <li key={row.url} className={`link link--${linkKind(row.url)}`}>
              <button className="link__open" onClick={() => void window.offli.openLink(row.url)}>
                <span className="link__icon">
                  <Icon name={KIND_ICON[linkKind(row.url)]} size={18} />
                </span>
                <span className="link__text">
                  <span className="link__label">{row.label}</span>
                  <small>{row.file ? t('journal.foundIn', { file: row.file }) : shortUrl(row.url)}</small>
                </span>
                <Icon name="external" size={14} />
              </button>
              <button
                className="icon-btn link__remove"
                onClick={() => remove(row)}
                aria-label={t('journal.removeLink')}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <AddLink
          onClose={() => setAdding(false)}
          onAdd={(url, label) => {
            setAdding(false)
            if (j && !own.has(url)) p.onSave({ ...j, links: [...j.links, label ? { url, label } : { url }] })
          }}
        />
      ) : (
        <button className="text-btn" onClick={() => setAdding(true)} disabled={!j}>
          <Icon name="plus" size={14} />
          {t('journal.addLink')}
        </button>
      )}
    </section>
  )
}
