import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import { normalizeUrl } from '../../../../shared/links'

/** Address and optional name; adds a link, or edits one when given its current values */
export function LinkForm(p: {
  initial?: { url: string; label: string }
  onSubmit(url: string, label: string): void
  onClose(): void
}): React.JSX.Element {
  const [url, setUrl] = useState(p.initial?.url ?? '')
  const [label, setLabel] = useState(p.initial?.label ?? '')
  const [invalid, setInvalid] = useState(false)
  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    const clean = normalizeUrl(url)
    if (!clean) return setInvalid(true)
    p.onSubmit(clean, label.trim())
  }
  return (
    <form
      className="link-form"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        p.onClose()
      }}
    >
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
        <button type="button" className="ghost" onClick={p.onClose}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="cta">
          {p.initial ? t('journal.saveLink') : t('journal.add')}
        </button>
      </div>
    </form>
  )
}
