import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Game } from '../../shared/types'

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp']

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
