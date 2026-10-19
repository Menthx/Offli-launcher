import { t } from '../../../../shared/i18n'
import type { Filter } from '../library/filters'

export interface BpSection {
  filter: Filter
  label: string
  count: number
}

/** LB / RB (or Q / E) switch section */
export function BpTabs({
  sections,
  current,
  onPick
}: {
  sections: BpSection[]
  current: Filter
  onPick(f: Filter): void
}): React.JSX.Element {
  return (
    <nav className="bp-tabs" aria-label={t('bp.section')}>
      <span className="bp-bumper" aria-hidden="true">
        LB
      </span>
      {sections.map((s) => (
        <button
          key={s.filter}
          className="bp-tab"
          aria-pressed={s.filter === current}
          tabIndex={-1}
          onClick={() => onPick(s.filter)}
        >
          {s.label}
          <span className="count">{s.count}</span>
        </button>
      ))}
      <span className="bp-bumper" aria-hidden="true">
        RB
      </span>
    </nav>
  )
}
