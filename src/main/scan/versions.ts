import { basename } from 'node:path'
import type { Game } from '../../shared/types'

/** '(Fr 1.1.3)' first, else the last x.y[.z] number */
export function parseVersion(folder: string): number[] {
  const m = /\(\s*fr\s*(\d+(?:\.\d+)*)\s*\)/i.exec(folder) ?? /(\d+(?:\.\d+)+)(?!.*\d+\.\d)/.exec(folder)
  return m ? m[1].split('.').map(Number) : []
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d) return d
  }
  return 0
}

/** Groups same-name fangames into one entry: newest version, others in `versions` */
export function groupVersions(games: Game[]): Game[] {
  const groups = new Map<string, Game[]>()
  const out: Game[] = []
  for (const g of games) {
    if (g.kind !== 'fangame') {
      out.push(g)
      continue
    }
    const key = g.name.toLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), g])
  }
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0])
      continue
    }
    const versions = list
      .map((g) => ({ ...g, variant: basename(g.dir) }))
      .sort(
        (a, b) =>
          compareVersions(parseVersion(b.variant), parseVersion(a.variant)) ||
          a.variant.length - b.variant.length ||
          a.variant.localeCompare(b.variant, 'fr')
      )
    out.push({ ...versions[0], versions })
  }
  return out
}
