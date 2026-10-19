import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Game } from '../../shared/types'

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp']

/** Graphics/Titles images that aren't the title screen: credits, splash, intro, backgrounds, effect layers */
export const NOT_A_TITLE =
  /^(credits|splash|intro)|(^|[_\s-])(bg\d*|background|overlay|effect|eff|shine|shade)([_\s-]|$)/i

export async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir)
  } catch {
    return []
  }
}

/** Case-insensitive subfolder lookup (Graphics/Titles vs graphics/titles) */
export async function findDirCi(dir: string, name: string): Promise<string | undefined> {
  const hit = (await listDir(dir)).find((f) => f.toLowerCase() === name.toLowerCase())
  return hit ? join(dir, hit) : undefined
}

export function sniffExt(data: Buffer): string {
  if (data[0] === 0xff && data[1] === 0xd8) return '.jpg'
  if (data.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp'
  return '.png'
}

export function isImage(file: string): boolean {
  return IMAGE_EXT.includes(extname(file).toLowerCase())
}

export async function download(url: string, headers: Record<string, string> = {}): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function localImage(game: Game): Promise<string | null> {
  const files = await listDir(game.dir)
  // ROMs: only a deliberate cover.png; <rom>.png files are usually emulator screenshots
  const wanted = game.kind !== 'fangame' ? ['cover'] : ['cover', 'folder']
  for (const w of wanted) {
    const hit = files.find((f) => isImage(f) && basename(f, extname(f)).toLowerCase() === w)
    if (hit) return join(game.dir, hit)
  }
  return null
}

/** title.png in Graphics/Titles, else the largest non-credit/splash/background image, else Icon.png / project_icon.png */
export async function fangameTitle(game: Game): Promise<string | null> {
  const graphics = await findDirCi(game.dir, 'Graphics')
  const titles = graphics && (await findDirCi(graphics, 'Titles'))
  if (titles) {
    const images = (await listDir(titles)).filter(isImage)
    const title = images.find((f) => basename(f, extname(f)).toLowerCase() === 'title')
    if (title) return join(titles, title)
    const candidates = images.filter((f) => !NOT_A_TITLE.test(basename(f, extname(f))))
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
