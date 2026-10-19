import { existsSync } from 'node:fs'
import { mkdir, open, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Game, Settings } from '../shared/types'
import { NDS_BANNER_ICON_SIZE, ndsBannerOffset, ndsIconToPng } from './ndsIcon'
import { baseGameFor, libretroThumbnailUrls } from './romHeader'
import { readRomHeader } from './scanner'
import { exeIconPng } from './cover/exeIcon'
import { IMAGE_EXT, download, fangameTitle, localImage, sniffExt } from './cover/files'

/** Cover lookup order: user pick, cover.png / folder.png, fangame title screen or Icon.png, SteamGridDB, base game cover, .exe icon or NDS icon; downloads are cached */
export class CoverResolver {
  private memo = new Map<string, Promise<string | null>>()

  constructor(
    private cacheDir: string,
    private settings: () => Settings,
    /** System icon (Electron app.getFileIcon) when the .exe can't be read */
    private fileIcon?: (path: string) => Promise<Buffer | null>
  ) {}

  invalidate(id?: string): void {
    if (id) this.memo.delete(id)
    else this.memo.clear()
  }

  /** Its name changed, so search again */
  async dropSteamGridDb(id: string): Promise<void> {
    this.memo.delete(id)
    for (const ext of IMAGE_EXT) await rm(join(this.cacheDir, `${id}-sgdb${ext}`), { force: true })
  }

  resolve(game: Game): Promise<string | null> {
    let p = this.memo.get(game.id)
    if (!p) {
      p = this.compute(game).catch(() => null)
      this.memo.set(game.id, p)
    }
    return p
  }

  private async compute(game: Game): Promise<string | null> {
    const s = this.settings()
    const override = s.coverOverrides[game.id]
    if (override && existsSync(override)) return override

    const local = await localImage(game)
    if (local) return local

    if (game.kind === 'fangame') {
      const title = await fangameTitle(game)
      if (title) return title
    }

    if (s.useSteamGridDb && s.steamGridDbKey) {
      const sgdb = await this.steamGridDb(game, s.steamGridDbKey)
      if (sgdb) return sgdb
    }

    if (game.kind !== 'fangame' && game.baseRom && s.useBaseRomCovers) {
      const base = await this.baseRomCover(game)
      if (base) return base
    }

    if (game.kind === 'fangame') return this.exeIcon(game)
    if (game.platform === 'nds') return this.ndsIcon(game)
    return null
  }

  /** Cached `<stem>.<ext>`, downloaded once */
  private async cached(stem: string, fetcher: () => Promise<Buffer | null>): Promise<string | null> {
    for (const ext of IMAGE_EXT) {
      const path = join(this.cacheDir, stem + ext)
      if (existsSync(path)) return path
    }
    const data = await fetcher()
    if (!data) return null
    const path = join(this.cacheDir, stem + sniffExt(data))
    await mkdir(this.cacheDir, { recursive: true })
    await writeFile(path, data)
    return path
  }

  private steamGridDb(game: Game, key: string): Promise<string | null> {
    return this.cached(`${game.id}-sgdb`, async () => {
      const auth = { Authorization: `Bearer ${key}` }
      const api = 'https://www.steamgriddb.com/api/v2'
      const term = /pok[eé]mon/i.test(game.name) ? game.name : `Pokemon ${game.name}`
      try {
        const search = await fetch(`${api}/search/autocomplete/${encodeURIComponent(term)}`, {
          headers: auth,
          signal: AbortSignal.timeout(10_000)
        })
        const found = (await search.json()) as { data?: { id: number }[] }
        const sgdbId = found.data?.[0]?.id
        if (!sgdbId) return null
        const grids = await fetch(`${api}/grids/game/${sgdbId}?dimensions=600x900`, {
          headers: auth,
          signal: AbortSignal.timeout(10_000)
        })
        const list = (await grids.json()) as { data?: { url: string }[] }
        const url = list.data?.[0]?.url
        return url ? download(url) : null
      } catch {
        return null
      }
    })
  }

  private baseRomCover(game: Game): Promise<string | null> {
    const base = game.baseRom && baseGameFor(game.platform, game.baseRom.code)
    if (!base) return Promise.resolve(null)
    // GBA/NDS: code without the region letter; GB/GBC: full internal title
    const code = game.baseRom!.code
    const short = game.platform === 'gba' || game.platform === 'nds' ? code.slice(0, 3) : code
    const key = `base-${game.platform}-${short.replace(/[^\w]/g, '_')}`
    return this.cached(key, async () => {
      for (const url of libretroThumbnailUrls(base)) {
        const data = await download(url)
        if (data) return data
      }
      return null
    })
  }

  private exeIcon(game: Game): Promise<string | null> {
    return this.cached(
      `${game.id}-exe`,
      async () => (await exeIconPng(game.path)) ?? (await this.fileIcon?.(game.path)) ?? null
    )
  }

  private ndsIcon(game: Game): Promise<string | null> {
    return this.cached(`${game.id}-icon`, async () => {
      const header = await readRomHeader(game.path, 'nds', 0x70)
      const offset = ndsBannerOffset(header)
      if (!offset) return null
      const fh = await open(game.path, 'r')
      try {
        const buf = Buffer.alloc(NDS_BANNER_ICON_SIZE)
        const { bytesRead } = await fh.read(buf, 0, buf.length, offset)
        return ndsIconToPng(buf.subarray(0, bytesRead))
      } finally {
        await fh.close()
      }
    })
  }
}
