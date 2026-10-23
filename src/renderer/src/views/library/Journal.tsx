import { useState } from 'react'
import { t } from '../../../../shared/i18n'
import type { GameJournal, JournalNote } from '../../../../shared/types'
import { Icon } from '../../components/icons'
import { noteDate } from '../../format'

/** Grows with its text, up to the CSS max-height */
function fit(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/** Enter saves, Shift+Enter adds a line, Esc cancels (when allowed) */
function NoteInput(p: {
  initial?: string
  label: string
  placeholder?: string
  autoFocus?: boolean
  onSave(text: string): void
  onCancel?(): void
}): React.JSX.Element {
  const [text, setText] = useState(p.initial ?? '')
  return (
    <textarea
      className="note-input"
      rows={1}
      value={text}
      aria-label={p.label}
      placeholder={p.placeholder}
      autoFocus={p.autoFocus}
      ref={fit}
      onChange={(e) => {
        setText(e.target.value)
        fit(e.target)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault()
          if (!text.trim() && !p.onCancel) return
          p.onSave(text.trim())
          if (!p.onCancel) setText('')
        }
        if (e.key === 'Escape' && p.onCancel) {
          e.stopPropagation()
          p.onCancel()
        }
      }}
    />
  )
}

function Note(p: { note: JournalNote; onChange(text: string): void; onDelete(): void }): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (editing)
    return (
      <li className="note is-editing">
        <NoteInput
          initial={p.note.text}
          label={t('journal.edit')}
          autoFocus
          onSave={(text) => {
            setEditing(false)
            if (text) p.onChange(text)
            else p.onDelete()
          }}
          onCancel={() => setEditing(false)}
        />
        <small>{t('journal.editHint')}</small>
      </li>
    )
  return (
    <li className="note" onMouseLeave={() => setConfirm(false)}>
      <small>{noteDate(p.note.at)}</small>
      <p>{p.note.text}</p>
      <div className="note-tools">
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('journal.edit')}>
          <Icon name="pencil" size={14} />
        </button>
        <button
          className={`icon-btn ${confirm ? 'is-confirm' : ''}`}
          onClick={() => (confirm ? p.onDelete() : setConfirm(true))}
          aria-label={t('journal.delete')}
        >
          <Icon name="trash" size={14} />
          {confirm && <span>{t('journal.confirmDelete')}</span>}
        </button>
      </div>
    </li>
  )
}

/** Player notes, newest first */
export function Journal({
  journal,
  onSave
}: {
  journal: GameJournal | undefined
  onSave(next: GameJournal): void
}): React.JSX.Element {
  const notes = journal?.notes ?? []
  const update = (list: JournalNote[]): void => {
    if (journal) onSave({ ...journal, notes: list })
  }
  return (
    <section className="gp-box journal" aria-labelledby="journal-title">
      <header className="gp-box__head">
        <h5 id="journal-title">{t('journal.title')}</h5>
        {notes.length > 0 && (
          <span className="muted">
            {notes.length === 1 ? t('journal.countOne') : t('journal.countMany', { n: notes.length })}
          </span>
        )}
      </header>
      <div className="note-compose">
        <NoteInput
          label={t('journal.placeholder')}
          placeholder={t('journal.placeholder')}
          onSave={(text) => update([{ id: crypto.randomUUID(), at: Date.now(), text }, ...notes])}
        />
        <small data-tooltip={t('journal.newlineHint')}>{t('journal.enterHint')}</small>
      </div>
      {journal && notes.length === 0 && <p className="muted journal-empty">{t('journal.empty')}</p>}
      <ul className="notes">
        {notes.map((n) => (
          <Note
            key={n.id}
            note={n}
            onChange={(text) => update(notes.map((x) => (x.id === n.id ? { ...x, text } : x)))}
            onDelete={() => update(notes.filter((x) => x.id !== n.id))}
          />
        ))}
      </ul>
    </section>
  )
}
