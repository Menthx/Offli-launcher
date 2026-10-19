import type { Dict } from '..'
import { app } from './app'
import { setup } from './setup'

/** Same keys as French, enforced by the Dict type */
export const es: Dict = { ...app, ...setup }
