import { existsSync } from 'node:fs'
import { mkdir, open, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Game, Settings } from '../shared/types'
import { NDS_BANNER_ICON_SIZE, ndsBannerOffset, ndsIconToPng } from './ndsIcon'
import { baseGameFor, libretroThumbnailUrls } from './romHeader'
import { readRomHeader } from './scanner'

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp']

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

/** Trouve un sous-dossier sans tenir compte de la casse (Graphics/Titles vs graphics/titles) */
async function findDirCi(dir: string, name: string): Promise<string | undefined> {
  const hit = (await listDir(dir)).find((f) => f.toLowerCase() === name.toLowerCase())
  return hit ? join(dir, hit) : undefined
}

function sniffExt(data: Buffer): string {
  if (data[0] === 0xff && data[1] === 0xd8) return '.jpg'
  if (data.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp'
  return '.png'
}

function isImage(file: string): boolean {
  return IMAGE_EXT.includes(extname(file).toLowerCase())
}

async function download(url: string, headers: Record<string, string> = {}): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Résout l'image d'un jeu, dans cet ordre :
 * 1. image choisie par l'utilisateur
 * 2. image posée à côté du jeu (cover.png, <rom>.png, capture mGBA <rom>-0.png)
 * 3. fangame : écran titre dans Graphics/Titles, sinon Icon.png ou project_icon.png
 * 4. SteamGridDB (si activé avec une clé)
 * 5. romhack : jaquette du jeu de base (libretro-thumbnails)
 * 6. romhack NDS : icône embarquée dans la ROM
 * Les téléchargements sont mis en cache dans `cacheDir`.
 */
export class CoverResolver {
  private memo = new Map<string, Promise<string | null>>()

  constructor(
    private cacheDir: string,
    private settings: () => Settings
  ) {}

  invalidate(id?: string): void {
    if (id) this.memo.delete(id)
    else this.memo.clear()
  }

  /** Oublie l'image SteamGridDB d'un jeu (cherchée par son nom, qui a changé) */
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

    const local = await this.localImage(game)
    if (local) return local

    if (game.kind === 'fangame') {
      const title = await this.fangameTitle(game)
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

    if (game.platform === 'nds') return this.ndsIcon(game)
    return null
  }

  private async localImage(game: Game): Promise<string | null> {
    const files = await listDir(game.dir)
    const stem = basename(game.path, extname(game.path)).toLowerCase()
    // ROM : cover.png, <rom>.png, puis la capture d'écran de mGBA (<rom>-0.png)
    const wanted = game.kind !== 'fangame' ? ['cover', stem, `${stem}-0`] : ['cover', 'folder']
    for (const w of wanted) {
      const hit = files.find((f) => isImage(f) && basename(f, extname(f)).toLowerCase() === w)
      if (hit) return join(game.dir, hit)
    }
    return null
  }

  /**
   * Écran titre d'un fangame : title.png dans Graphics/Titles, sinon la plus grande image
   * qui n'est ni un crédit, ni un splash, ni un fond (bg_*) ; à défaut, l'icône du jeu
   * (Icon.png, ou project_icon.png d'un projet Pokémon SDK).
   */
  private async fangameTitle(game: Game): Promise<string | null> {
    const graphics = await findDirCi(game.dir, 'Graphics')
    const titles = graphics && (await findDirCi(graphics, 'Titles'))
    if (titles) {
      const images = (await listDir(titles)).filter(isImage)
      const title = images.find((f) => basename(f, extname(f)).toLowerCase() === 'title')
      if (title) return join(titles, title)
      const candidates = images.filter((f) => !/^(credits|splash|bg_)/i.test(f))
      let best: { file: string; size: number } | undefined
      for (const f of candidates) {
        const size = (await stat(join(titles, f)).catch(() => undefined))?.size ?? 0
        if (!best || size > best.size) best = { file: f, size }
      }
      if (best) return join(titles, best.file)
    }
    const root = await listDir(game.dir)
    const icon = ['icon.png', 'project_icon.png'].map((n) => root.find((f) => f.toLowerCase() === n)).find(Boolean)
    return icon ? join(game.dir, icon) : null
  }

  /** Renvoie le fichier en cache `<stem>.<ext>` ou le télécharge une fois */
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
    // GBA/NDS : le code sans la lettre de région ; GB/GBC : le titre interne complet
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
