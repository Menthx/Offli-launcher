import { describe, expect, it } from 'vitest'
import { GRIDS_PER_PAGE, SgdbError, SteamGridDb, isSteamGridDbUrl } from '../src/main/steamgriddb'

/** fetch simulé : répond selon l'URL demandée et garde la trace des appels */
function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = []
  const impl = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    const hit = Object.entries(routes).find(([prefix]) => url.includes(prefix))
    if (!hit) return new Response('{}', { status: 404 })
    const { status = 200, body = {} } = hit[1]
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return { fetch: impl, calls }
}

const grid = (id: number, host = 'cdn2.steamgriddb.com') => ({
  id,
  url: `https://${host}/grid/${id}.png`,
  thumb: `https://${host}/thumb/${id}.jpg`,
  width: 600,
  height: 900
})

describe('isSteamGridDbUrl', () => {
  it('accepte seulement https sur steamgriddb.com', () => {
    expect(isSteamGridDbUrl('https://cdn2.steamgriddb.com/grid/1.png')).toBe(true)
    expect(isSteamGridDbUrl('https://steamgriddb.com/x.png')).toBe(true)
    expect(isSteamGridDbUrl('http://cdn2.steamgriddb.com/grid/1.png')).toBe(false)
    expect(isSteamGridDbUrl('https://steamgriddb.com.evil.example/x.png')).toBe(false)
    expect(isSteamGridDbUrl('https://evil.example/steamgriddb.com.png')).toBe(false)
    expect(isSteamGridDbUrl('file:///C:/secret.png')).toBe(false)
    expect(isSteamGridDbUrl(42)).toBe(false)
  })
})

describe('SteamGridDb', () => {
  it('cherche des jeux par nom avec la clé en en-tête', async () => {
    let auth = ''
    const impl = (async (_url: string | URL | Request, init?: RequestInit) => {
      auth = new Headers(init?.headers).get('Authorization') ?? ''
      return new Response(JSON.stringify({ data: [{ id: 7, name: 'Pokémon Reborn', release_date: 1420070400 }, { bad: true }] }))
    }) as typeof fetch
    const games = await new SteamGridDb('clé-test', impl).search('Pokémon Reborn')
    expect(auth).toBe('Bearer clé-test')
    expect(games).toEqual([{ id: 7, name: 'Pokémon Reborn', year: 2015 }])
  })

  it('pagine les jaquettes portrait', async () => {
    const full = Array.from({ length: GRIDS_PER_PAGE }, (_, i) => grid(i))
    const { fetch, calls } = fakeFetch({ 'page=0': { body: { data: full } }, 'page=1': { body: { data: [grid(99)] } } })
    const sgdb = new SteamGridDb('k', fetch)
    const p0 = await sgdb.grids(7, 0)
    expect(p0.grids).toHaveLength(GRIDS_PER_PAGE)
    expect(p0.hasMore).toBe(true)
    const p1 = await sgdb.grids(7, 1)
    expect(p1).toEqual({ grids: [grid(99)], hasMore: false })
    expect(calls[0]).toContain('/grids/game/7?dimensions=600x900,342x482')
  })

  it('écarte les images hors steamgriddb.com', async () => {
    const { fetch } = fakeFetch({ '/grids/': { body: { data: [grid(1), grid(2, 'evil.example'), { ...grid(3), url: 'http://cdn2.steamgriddb.com/3.png' }] } } })
    const { grids } = await new SteamGridDb('k', fetch).grids(7, 0)
    expect(grids.map((g) => g.id)).toEqual([1])
  })

  it('signale une clé refusée (401)', async () => {
    const { fetch } = fakeFetch({ '/search/': { status: 401 } })
    await expect(new SteamGridDb('mauvaise', fetch).search('Reborn')).rejects.toMatchObject({ kind: 'unauthorized' })
  })

  it('renvoie une liste vide si rien n’est trouvé', async () => {
    const { fetch } = fakeFetch({ '/search/': { body: { success: true, data: [] } } })
    expect(await new SteamGridDb('k', fetch).search('Inconnu')).toEqual([])
  })

  it('refuse de télécharger une URL hors steamgriddb.com', async () => {
    const { fetch, calls } = fakeFetch({})
    await expect(new SteamGridDb('k', fetch).download('https://evil.example/x.png')).rejects.toBeInstanceOf(SgdbError)
    expect(calls).toEqual([])
  })
})
