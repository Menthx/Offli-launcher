/**
 * Client SteamGridDB (API v2), utilisé seulement dans le process principal :
 * la clé API ne passe jamais au rendu.
 */

const API = 'https://www.steamgriddb.com/api/v2'
const TIMEOUT_MS = 10_000
/** Jaquettes portrait, dans l'ordre de préférence */
const DIMENSIONS = '600x900,342x482'
export const GRIDS_PER_PAGE = 24

export type SgdbErrorKind = 'unauthorized' | 'network'

export class SgdbError extends Error {
  constructor(readonly kind: SgdbErrorKind) {
    super(kind)
  }
}

export interface SgdbGame {
  id: number
  name: string
  year?: number
}

export interface SgdbGrid {
  id: number
  url: string
  thumb: string
  width: number
  height: number
}

/** Seules les URL https de steamgriddb.com (et sous-domaines, ex. cdn2) sont acceptées */
export function isSteamGridDbUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && (u.hostname === 'steamgriddb.com' || u.hostname.endsWith('.steamgriddb.com'))
  } catch {
    return false
  }
}

type Fetch = typeof fetch

export class SteamGridDb {
  constructor(
    private key: string,
    private fetchImpl: Fetch = fetch
  ) {}

  private async get<T>(path: string): Promise<T> {
    let res: Response
    try {
      res = await this.fetchImpl(`${API}${path}`, {
        headers: { Authorization: `Bearer ${this.key}` },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
    } catch {
      throw new SgdbError('network')
    }
    if (res.status === 401 || res.status === 403) throw new SgdbError('unauthorized')
    if (res.status === 404) return { success: true, data: [] } as T
    if (!res.ok) throw new SgdbError('network')
    try {
      return (await res.json()) as T
    } catch {
      throw new SgdbError('network')
    }
  }

  /** Jeux SteamGridDB correspondant à un nom */
  async search(term: string): Promise<SgdbGame[]> {
    const q = term.trim()
    if (!q) return []
    const body = await this.get<{ data?: { id?: unknown; name?: unknown; release_date?: unknown }[] }>(
      `/search/autocomplete/${encodeURIComponent(q)}`
    )
    return (body.data ?? []).flatMap((g) =>
      typeof g.id === 'number' && typeof g.name === 'string'
        ? [
            {
              id: g.id,
              name: g.name,
              year: typeof g.release_date === 'number' ? new Date(g.release_date * 1000).getFullYear() : undefined
            }
          ]
        : []
    )
  }

  /** Une page de jaquettes portrait d'un jeu ; les URL hors steamgriddb.com sont écartées */
  async grids(gameId: number, page: number): Promise<{ grids: SgdbGrid[]; hasMore: boolean }> {
    const body = await this.get<{ data?: { id?: unknown; url?: unknown; thumb?: unknown; width?: unknown; height?: unknown }[] }>(
      `/grids/game/${gameId}?dimensions=${DIMENSIONS}&page=${page}&limit=${GRIDS_PER_PAGE}`
    )
    const raw = body.data ?? []
    const grids = raw.flatMap((g) =>
      typeof g.id === 'number' && isSteamGridDbUrl(g.url) && isSteamGridDbUrl(g.thumb)
        ? [{ id: g.id, url: g.url, thumb: g.thumb, width: Number(g.width) || 0, height: Number(g.height) || 0 }]
        : []
    )
    return { grids, hasMore: raw.length >= GRIDS_PER_PAGE }
  }

  /** Télécharge une image (URL steamgriddb.com uniquement) */
  async download(url: string): Promise<Buffer> {
    if (!isSteamGridDbUrl(url)) throw new SgdbError('network')
    let res: Response
    try {
      res = await this.fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      throw new SgdbError('network')
    }
    if (!res.ok) throw new SgdbError('network')
    return Buffer.from(await res.arrayBuffer())
  }
}
