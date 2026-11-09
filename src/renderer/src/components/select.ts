export interface SelectOption<V extends string> {
  value: V
  label: string
  /** Language of the label (e.g. 'Español' in a French UI) */
  lang?: string
}
