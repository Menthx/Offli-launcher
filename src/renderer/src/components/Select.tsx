import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from './icons'

export interface SelectOption<V extends string> {
  value: V
  label: string
  /** Language of the label (e.g. 'Español' in a French UI) */
  lang?: string
}

interface Props<V extends string> {
  id: string
  value: V
  options: SelectOption<V>[]
  onChange(value: V): void
  /** Accessible name when no <label htmlFor={id}> points to it */
  ariaLabel?: string
  className?: string
}

/** DA dropdown: inset trigger, elevated list, checked option in accent; full keyboard support */
export function Select<V extends string>(p: Props<V>): React.JSX.Element {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const selected = Math.max(
    0,
    p.options.findIndex((o) => o.value === p.value)
  )
  const [active, setActive] = useState(selected)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const show = (): void => {
    setActive(selected)
    setOpen(true)
  }
  const close = (focus = true): void => {
    setOpen(false)
    if (focus) trigger.current?.focus()
  }
  const choose = (i: number): void => {
    if (p.options[i] && i !== selected) p.onChange(p.options[i].value)
    close()
  }

  useEffect(() => {
    if (!open) return
    list.current?.focus({ preventScroll: true })
    const onPointer = (e: PointerEvent): void => {
      if (!wrap.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onListKey = (e: React.KeyboardEvent): void => {
    const last = p.options.length - 1
    const next: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last
    }
    if (e.key in next) setActive(next[e.key])
    else if (e.key === 'Enter' || e.key === ' ') choose(active)
    else if (e.key === 'Escape') close()
    else if (e.key === 'Tab') return close(false)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className={`select ${p.className ?? ''}`} data-open={open ? '' : undefined} ref={wrap}>
      <button
        ref={trigger}
        id={p.id}
        type="button"
        className="input select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={p.ariaLabel}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
            e.preventDefault()
            show()
          }
        }}
      >
        <span className="select__value" lang={p.options[selected]?.lang}>
          {p.options[selected]?.label}
        </span>
        <span className="chevron" aria-hidden="true">
          <Icon name="chevron" size={14} />
        </span>
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          className="select__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={p.id}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
        >
          {p.options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              lang={o.lang}
              aria-selected={i === selected}
              className={`select__option ${i === active ? 'is-active' : ''}`}
              onPointerMove={() => i !== active && setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              <Icon name="check" size={14} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
