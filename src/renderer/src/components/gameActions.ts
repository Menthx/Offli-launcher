import type { IconName } from './icons'

export interface MenuAction {
  label: string
  icon: IconName
  run(): void | Promise<void>
  /** Reachable with arrows and announced, but does nothing */
  disabled?: boolean
  /** Linked with aria-describedby */
  hint?: string
  /** Shown in red below a separator */
  danger?: boolean
}
