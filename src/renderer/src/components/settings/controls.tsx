/** Settings building blocks: group card, label | control row, switch */

export function Group({
  title,
  id,
  children
}: {
  title?: string
  id?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="settings-group" aria-labelledby={title && id ? id : undefined}>
      {title && (
        <h4 className="settings-group__title" id={id}>
          {title}
        </h4>
      )}
      <div className="settings-group__card">{children}</div>
    </section>
  )
}

export function Row({
  label,
  desc,
  labelId,
  htmlFor,
  stacked,
  children
}: {
  label: React.ReactNode
  desc?: React.ReactNode
  labelId?: string
  htmlFor?: string
  stacked?: boolean
  children?: React.ReactNode
}): React.JSX.Element {
  const Label = htmlFor ? 'label' : 'span'
  return (
    <div className={`settings-row ${stacked ? 'settings-row--stacked' : ''}`}>
      <div className="settings-row__text">
        <Label className="settings-row__label" id={labelId} htmlFor={htmlFor}>
          {label}
        </Label>
        {desc && <p className="settings-row__desc">{desc}</p>}
      </div>
      {children && <div className="settings-row__control">{children}</div>}
    </div>
  )
}

export function Switch({
  id,
  checked,
  onChange,
  desc,
  children
}: {
  id: string
  checked: boolean
  onChange(on: boolean): void
  desc?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Row label={children} desc={desc} labelId={`${id}-label`}>
      <button
        id={id}
        className="toggle"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" />
      </button>
    </Row>
  )
}
