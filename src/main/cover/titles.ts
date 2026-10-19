import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Game } from '../../shared/types'
import { findDirCi, isImage, listDir } from './files'

/** Size and content of an image, measured on a small copy */
export interface ImageStats {
  width: number
  height: number
  /** Share of opaque pixels (0 to 1) */
  coverage: number
  /** Distinct colors among opaque pixels, 4 bits per channel */
  colors: number
}
export type StatsReader = (path: string) => Promise<ImageStats | null>

/** Width of the copy that stats are measured on */
export const SAMPLE_WIDTH = 48

/** Graphics/Titles images that aren't the title screen: credits, splash, intro, prompts, backgrounds, layers, leftovers */
const NOT_A_TITLE =
  /^(credits|splash|intro|start|press)|(^|[_\s-])(bg\d*|background|overlay|effect|eff|shine|shade|back|glow|mask|old|copia|copy)([_\s-]|\d|$)/i
/** Layers of a logo: its shine, shadow, mask, back plate */
const NOT_A_LOGO = /(^|[_\s-])(overlay|effect|eff|shine|shade|back|glow|mask|old|copia|copy)([_\s-]|\d|$)/i
const LOGO = /logo/i
const TITLE = /tit(le|ulo|re|el)/i

/** Below this, an image is an outline, a mask or a flat silhouette */
const MIN_DETAIL = 0.1
/** Each folder gets at most this many candidates measured, largest files first */
const MAX_CANDIDATES = 24

/** Engine template title screens (Pokémon Essentials) that say nothing about the game */
const TEMPLATES = new Set(['8ee8ca1b50484bea34329070b1067acfce0250e1', '0233e9d1d2dfeec11349390bb5588acf459db62b'])

/** Coverage and color count of a BGRA (or RGBA) bitmap */
export function pixelStats(bitmap: Buffer): Pick<ImageStats, 'coverage' | 'colors'> {
  const colors = new Set<number>()
  let opaque = 0
  for (let i = 0; i + 3 < bitmap.length; i += 4) {
    if (bitmap[i + 3] < 128) continue
    opaque++
    colors.add(((bitmap[i] >> 4) << 8) | ((bitmap[i + 1] >> 4) << 4) | (bitmap[i + 2] >> 4))
  }
  const pixels = Math.floor(bitmap.length / 4)
  return { coverage: pixels ? opaque / pixels : 0, colors: colors.size }
}

/** 0 when unusable; a logo beats a full screen (it names the game), portrait art gets a small bonus */
export function titleScore(name: string, s: ImageStats): number {
  if (s.width < 160 || s.height < 80) return 0
  const detail = (s.coverage * Math.min(s.colors, 64)) / 64
  if (detail < MIN_DETAIL) return 0
  return detail + (LOGO.test(name) ? 1 : 0) + (s.height >= s.width ? 0.1 : 0)
}

const isTemplate = async (path: string): Promise<boolean> =>
  TEMPLATES.has(
    createHash('sha1')
      .update(await readFile(path).catch(() => Buffer.alloc(0)))
      .digest('hex')
  )

/** Best logo or title screen in Graphics/Titles, scored on its content rather than its file size */
export async function fangameTitle(game: Game, stats: StatsReader): Promise<string | null> {
  const graphics = await findDirCi(game.dir, 'Graphics')
  const titles = graphics && (await findDirCi(graphics, 'Titles'))
  if (!titles) return null
  const names = (await listDir(titles)).filter((f) => {
    const stem = basename(f, extname(f))
    // gen1_bg_logo is a whole title screen: logos only skip their own layers
    return isImage(f) && (LOGO.test(stem) ? !NOT_A_LOGO.test(stem) : TITLE.test(stem) && !NOT_A_TITLE.test(stem))
  })
  const sized = await Promise.all(
    names.map(async (f) => ({ f, size: (await stat(join(titles, f)).catch(() => undefined))?.size ?? 0 }))
  )
  sized.sort((a, b) => b.size - a.size)
  let best: { path: string; score: number } | undefined
  for (const { f } of sized.slice(0, MAX_CANDIDATES)) {
    const path = join(titles, f)
    const s = await stats(path)
    const score = s ? titleScore(basename(f, extname(f)), s) : 0
    if (score > (best?.score ?? 0) && !(await isTemplate(path))) best = { path, score }
  }
  return best?.path ?? null
}

/** Icon.png (Essentials) or project_icon.png at the game root, else graphics/icons/game.png (Pokémon Studio) */
export async function gameIcon(game: Game): Promise<string | null> {
  const root = await listDir(game.dir)
  const icon = ['icon.png', 'project_icon.png'].map((n) => root.find((f) => f.toLowerCase() === n)).find(Boolean)
  if (icon) return join(game.dir, icon)
  const graphics = await findDirCi(game.dir, 'graphics')
  const icons = graphics && (await findDirCi(graphics, 'icons'))
  const studio = icons && (await listDir(icons)).find((f) => f.toLowerCase() === 'game.png')
  return icons && studio ? join(icons, studio) : null
}
