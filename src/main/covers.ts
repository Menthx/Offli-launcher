import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Game, Settings } from '../shared/types'
import { NDS_BANNER_ICON_SIZE, ndsBannerOffset, ndsIconToPng } from './ndsIcon'
import { baseGameFor, libretroThumbnailUrls } from './romHeader'
import { readRomHeader } from './scanner'
import { exeIconPng, pngWidth } from './cover/exeIcon'
import { IMAGE_EXT, download, localImage, sniffExt } from './cover/files'
import { type StatsReader, fangameTitle, gameIcon } from './cover/titles'

/** Below this, a fangame's .exe icon is too blurry to use while another image exists */
const MIN_EXE_ICON = 48
/** Engine default .exe icons (Essentials Poké Ball, Pokémon Studio gear), as extracted PNGs */
const GENERIC_EXE_ICONS = new Set([
  '726054f7dbc4ede4e630ae0a475e0113dd11431f',
  '446898dad2e2a07c95f45a358e4f8de4f552614e'
])

/** Width of an extracted .exe icon, 0 for an engine default */
async function exeIconWidth(path: string): Promise<number> {
  const png = await readFile(path).catch(() => Buffer.alloc(0))
  return GENERIC_EXE_ICONS.has(createHash('sha1').update(png).digest('hex')) ? 0 : pngWidth(png)
}

/** Cover lookup order: user pick, cover.png / folder.png, fangame logo or title screen, own .exe icon, Icon.png, SteamGridDB, base game cover, system or NDS icon; downloads are cached */
export class CoverResolver {
  private memo = new Map<string, Promise<string | null>>()

  constructor(
    private cacheDir: string,
    private settings: () => Settings,
    /** System icon (Electron app.getFileIcon) when the .exe can't be read */
    private fileIcon?: (path: string) => Promise<Buffer | null>,
    /** Image measurements for picking a title screen (Electron nativeImage) */
    private stats: StatsReader = async () => null
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

    // Fangames: the logo or title screen names the game, then its own .exe icon, then Icon.png
    const exe = game.kind === 'fangame' ? await this.exeIcon(game) : null
    const exeWidth = exe ? await exeIconWidth(exe) : 0
    if (game.kind === 'fangame') {
      const found = (await fangameTitle(game, this.stats)) ?? (exeWidth >= MIN_EXE_ICON ? exe : await gameIcon(game))
      if (found) return found
    }

    if (s.useSteamGridDb && s.steamGridDbKey) {
      const sgdb = await this.steamGridDb(game, s.steamGridDbKey)
      if (sgdb) return sgdb
    }

    if (game.kind !== 'fangame' && game.baseRom && s.useBaseRomCovers) {
      const base = await this.baseRomCover(game)
      if (base) return base
    }

    // An engine default icon says nothing: the name card is clearer
    if (game.kind === 'fangame') return exe ? (exeWidth ? exe : null) : this.systemIcon(game)
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
    return this.cached(`${game.id}-exeicon`, () => exeIconPng(game.path))
  }

  private systemIcon(game: Game): Promise<string | null> {
    return this.cached(`${game.id}-sysicon`, async () => (await this.fileIcon?.(game.path)) ?? null)
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
