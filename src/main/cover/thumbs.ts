import { nativeImage } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Twice a grid card (170 px), for high-density screens */
export const THUMB_WIDTH = 360

const pending = new Map<string, Promise<string>>()

/** Grid card thumbnail cached on disk (key: path, mtime, size); small or WebP images are served as is */
export function thumbnailFor(src: string, dir: string): Promise<string> {
  let p = pending.get(src)
  if (!p) {
    p = makeThumbnail(src, dir).catch(() => src)
    pending.set(src, p)
    void p.finally(() => pending.delete(src))
  }
  return p
}

async function makeThumbnail(src: string, dir: string): Promise<string> {
  const st = await stat(src)
  const key = createHash('sha1').update(`${src}|${st.mtimeMs}|${st.size}`).digest('hex').slice(0, 16)
  const out = join(dir, `${key}.png`)
  if (existsSync(out)) return out
  const img = nativeImage.createFromPath(src)
  if (img.isEmpty()) return src
  const { width } = img.getSize()
  if (width <= THUMB_WIDTH * 1.25) return src
  await mkdir(dir, { recursive: true })
  await writeFile(out, img.resize({ width: THUMB_WIDTH, quality: 'good' }).toPNG())
  return out
}
