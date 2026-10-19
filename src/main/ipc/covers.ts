import { ipcMain, net, protocol } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { CoverSize, SgdbResult } from '../../shared/types'
import { sniffExt as ext } from '../cover/files'
import { thumbnailFor } from '../cover/thumbs'
import { COVER_SCHEME, type MainContext } from '../context'
import { SgdbError, type SgdbGrid, SteamGridDb } from '../steamgriddb'

const sgdbFail = (err: unknown): SgdbResult<never> => ({
  ok: false,
  error: err instanceof SgdbError ? err.kind : 'network'
})

/** Covers served over offli-img:// and SteamGridDB picking */
export function registerCoverIpc(ctx: MainContext): void {
  const { settings, covers, coverPaths, thumbPaths } = ctx
  const thumbDir = join(ctx.data, 'covers', 'thumbs')
  // The renderer only passes ids
  const sgdbThumbs = new Map<string, string>()
  const sgdbGrids = new Map<number, SgdbGrid>()
  const sgdbDir = join(ctx.data, 'covers', 'sgdb')
  const sgdb = (): SteamGridDb | null =>
    settings.data.steamGridDbKey ? new SteamGridDb(settings.data.steamGridDbKey) : null

  protocol.handle(COVER_SCHEME, (req) => {
    const url = new URL(req.url)
    const id = url.pathname.replace(/^\//, '')
    // offli-img://sgdb/<id>, cover/<id>, thumb/<id>
    const maps: Record<string, Map<string, string>> = {
      sgdb: sgdbThumbs,
      cover: coverPaths,
      thumb: thumbPaths
    }
    const path = maps[url.host]?.get(id)
    if (!path) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(path).toString())
  })

  ipcMain.handle('cover:resolve', async (_e, id: string, size: CoverSize = 'full') => {
    const game = ctx.findGame(id)
    const path = game && (await covers.resolve(game))
    if (!path) return null
    coverPaths.set(id, path)
    if (size !== 'thumb') return ctx.coverUrl(id)
    thumbPaths.set(id, await thumbnailFor(path, thumbDir))
    return ctx.coverUrl(id, 'thumb')
  })
  ipcMain.handle('cover:set', async (_e, id: string, path: string | null) => {
    if (path) settings.data.coverOverrides[id] = path
    else delete settings.data.coverOverrides[id]
    await settings.save()
    ctx.dropCovers(id)
    const game = ctx.findGame(id)
    const resolved = game && (await covers.resolve(game))
    if (!resolved) return null
    coverPaths.set(id, resolved)
    return ctx.coverUrl(id)
  })

  // Nothing is requested until the picker opens
  ipcMain.handle(
    'sgdb:search',
    async (_e, term: string): Promise<SgdbResult<{ id: number; name: string; year?: number }[]>> => {
      const client = sgdb()
      if (!client) return { ok: false, error: 'unauthorized' }
      try {
        return { ok: true, value: await client.search(String(term)) }
      } catch (err) {
        return sgdbFail(err)
      }
    }
  )
  ipcMain.handle('sgdb:grids', async (_e, gameId: number, page: number) => {
    const client = sgdb()
    if (!client) return { ok: false, error: 'unauthorized' }
    try {
      const { grids, hasMore } = await client.grids(Number(gameId), Math.max(0, Number(page) || 0))
      await mkdir(join(sgdbDir, 'thumbs'), { recursive: true })
      const images = await Promise.all(
        grids.map(async (g) => {
          sgdbGrids.set(g.id, g)
          if (!sgdbThumbs.has(String(g.id))) {
            const bytes = await client.download(g.thumb)
            const path = join(sgdbDir, 'thumbs', String(g.id) + ext(bytes))
            await writeFile(path, bytes)
            sgdbThumbs.set(String(g.id), path)
          }
          return {
            id: g.id,
            thumb: `${COVER_SCHEME}://sgdb/${g.id}`,
            width: g.width,
            height: g.height
          }
        })
      )
      return { ok: true, value: { images, hasMore } }
    } catch (err) {
      return sgdbFail(err)
    }
  })
  ipcMain.handle('sgdb:pick', async (_e, id: string, imageId: number) => {
    const client = sgdb()
    const grid = sgdbGrids.get(Number(imageId))
    if (!client || !grid || !ctx.findGame(id)) return { ok: false, error: 'network' }
    try {
      const bytes = await client.download(grid.url)
      await mkdir(sgdbDir, { recursive: true })
      const path = join(sgdbDir, `${id}-${grid.id}${ext(bytes)}`)
      await writeFile(path, bytes)
      settings.data.coverOverrides[id] = path
      await settings.save()
      ctx.dropCovers(id)
      return { ok: true, value: null }
    } catch (err) {
      return sgdbFail(err)
    }
  })
}
