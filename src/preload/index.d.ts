import type { OffliApi } from '../shared/types'

declare global {
  interface Window {
    offli: OffliApi
  }
}
