import { type FileHandle, open } from 'node:fs/promises'
import { encodePng } from '../ndsIcon'

/** Reads a Windows .exe icon from its resources (no dependency): first icon group, largest image; PNG kept as is, BMP converted */

const RT_ICON = 3
const RT_GROUP_ICON = 14
const PNG_SIGNATURE = '89504e470d0a1a0a'

interface ResEntry {
  id: number
  /** File offset of a subdirectory or a data entry */
  offset: number
  isDir: boolean
}

/** Never read more than this: the resource section sits well before it in a game .exe */
const MAX_READ = 64 * 1024 * 1024

export async function exeIconPng(path: string): Promise<Buffer | null> {
  let fh: FileHandle | undefined
  try {
    fh = await open(path, 'r')
    const head = await readAt(fh, 4096)
    const end = resourceEnd(head)
    if (!end || end > MAX_READ) return null
    // Only up to the end of .rsrc: Godot and other engines append their data after the PE image
    return extractIcon(end <= head.length ? head : await readAt(fh, end))
  } catch {
    return null
  } finally {
    await fh?.close()
  }
}

async function readAt(fh: FileHandle, length: number): Promise<Buffer> {
  const buf = Buffer.alloc(length)
  const { bytesRead } = await fh.read(buf, 0, length, 0)
  return buf.subarray(0, bytesRead)
}

/** File offset where the resource section ends, from the PE headers; 0 without resources */
export function resourceEnd(head: Buffer): number {
  if (head.length < 64 || head.toString('ascii', 0, 2) !== 'MZ') return 0
  const pe = head.readUInt32LE(0x3c)
  if (head.toString('ascii', pe, pe + 4) !== 'PE\0\0') return 0
  const opt = pe + 24
  const rva = head.readUInt32LE(opt + (head.readUInt16LE(opt) === 0x20b ? 112 : 96) + 16)
  const table = opt + head.readUInt16LE(pe + 20)
  for (let i = 0; rva && i < head.readUInt16LE(pe + 6); i++) {
    const s = table + i * 40
    const va = head.readUInt32LE(s + 12)
    const size = Math.max(head.readUInt32LE(s + 8), head.readUInt32LE(s + 16))
    if (rva >= va && rva < va + size) return head.readUInt32LE(s + 20) + head.readUInt32LE(s + 16)
  }
  return 0
}

/** Width of a PNG, from its IHDR chunk */
export const pngWidth = (png: Buffer): number => (png.length >= 24 ? png.readUInt32BE(16) : 0)

export function extractIcon(buf: Buffer): Buffer | null {
  if (buf.length < 64 || buf.toString('ascii', 0, 2) !== 'MZ') return null
  const pe = buf.readUInt32LE(0x3c)
  if (buf.toString('ascii', pe, pe + 4) !== 'PE\0\0') return null
  const sections = buf.readUInt16LE(pe + 6)
  const optSize = buf.readUInt16LE(pe + 20)
  const opt = pe + 24
  const dataDirs = opt + (buf.readUInt16LE(opt) === 0x20b ? 112 : 96)
  const rsrcRva = buf.readUInt32LE(dataDirs + 2 * 8)
  if (!rsrcRva) return null

  // Virtual address → file offset, from the section table
  const table = opt + optSize
  const toOffset = (rva: number): number => {
    for (let i = 0; i < sections; i++) {
      const s = table + i * 40
      const va = buf.readUInt32LE(s + 12)
      const size = Math.max(buf.readUInt32LE(s + 8), buf.readUInt32LE(s + 16))
      if (rva >= va && rva < va + size) return rva - va + buf.readUInt32LE(s + 20)
    }
    return -1
  }
  const root = toOffset(rsrcRva)
  if (root < 0) return null

  const entries = (dir: number): ResEntry[] => {
    const count = buf.readUInt16LE(dir + 12) + buf.readUInt16LE(dir + 14)
    return Array.from({ length: count }, (_, i) => {
      const e = dir + 16 + i * 8
      const data = buf.readUInt32LE(e + 4)
      return {
        id: buf.readUInt32LE(e),
        offset: root + (data & 0x7fffffff),
        isDir: (data & 0x80000000) !== 0
      }
    })
  }
  // Type → name → language → data (first language)
  const dataOf = (entry: ResEntry): Buffer | null => {
    let e: ResEntry | undefined = entry
    while (e?.isDir) e = entries(e.offset)[0]
    if (!e) return null
    const start = toOffset(buf.readUInt32LE(e.offset))
    return start < 0 ? null : buf.subarray(start, start + buf.readUInt32LE(e.offset + 4))
  }
  const typeDir = (type: number): ResEntry[] => {
    const t = entries(root).find((e) => e.id === type && e.isDir)
    return t ? entries(t.offset) : []
  }

  const group = typeDir(RT_GROUP_ICON)[0]
  const dir = group && dataOf(group)
  if (!dir || dir.length < 6) return null
  // Largest image (width 0 = 256 px), then highest color depth
  let best: { size: number; bpp: number; id: number } | undefined
  for (let i = 0; i < dir.readUInt16LE(4); i++) {
    const e = 6 + i * 14
    const cand = {
      size: dir[e] || 256,
      bpp: dir.readUInt16LE(e + 6),
      id: dir.readUInt16LE(e + 12)
    }
    if (!best || cand.size > best.size || (cand.size === best.size && cand.bpp > best.bpp)) best = cand
  }
  const icon = best && typeDir(RT_ICON).find((e) => e.id === best.id)
  const image = icon && dataOf(icon)
  if (!image) return null
  return image.toString('hex', 0, 8) === PNG_SIGNATURE ? Buffer.from(image) : dibToPng(image)
}

/** BMP (DIB) icon image: 1, 4, 8, 24 or 32 bpp, AND mask below */
export function dibToPng(dib: Buffer): Buffer | null {
  const headerSize = dib.readUInt32LE(0)
  const w = dib.readInt32LE(4)
  const h = dib.readInt32LE(8) / 2
  const bpp = dib.readUInt16LE(14)
  if (w <= 0 || h <= 0 || w > 512 || ![1, 4, 8, 24, 32].includes(bpp)) return null
  const colors = bpp <= 8 ? dib.readUInt32LE(32) || 1 << bpp : 0
  const pixels = headerSize + colors * 4
  const stride = ((w * bpp + 31) >> 5) << 2
  const mask = pixels + stride * h
  const maskStride = ((w + 31) >> 5) << 2
  const rgba = new Uint8Array(w * h * 4)
  let anyAlpha = false

  for (let y = 0; y < h; y++) {
    const row = pixels + (h - 1 - y) * stride // rows are stored bottom-up
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      let b: number,
        g: number,
        r: number,
        a = 255
      if (bpp >= 24) {
        const p = row + x * (bpp / 8)
        ;[b, g, r] = [dib[p], dib[p + 1], dib[p + 2]]
        if (bpp === 32) a = dib[p + 3]
      } else {
        const bit = x * bpp
        const index = (dib[row + (bit >> 3)] >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1)
        const c = headerSize + index * 4
        ;[b, g, r] = [dib[c], dib[c + 1], dib[c + 2]]
      }
      if (bpp === 32 && a) anyAlpha = true
      rgba.set([r, g, b, a], o)
    }
  }
  // No usable alpha: the AND mask tells which pixels are transparent
  if (!anyAlpha && mask + maskStride * h <= dib.length) {
    for (let y = 0; y < h; y++) {
      const row = mask + (h - 1 - y) * maskStride
      for (let x = 0; x < w; x++) {
        const transparent = (dib[row + (x >> 3)] >> (7 - (x & 7))) & 1
        rgba[(y * w + x) * 4 + 3] = transparent ? 0 : 255
      }
    }
  }
  return encodePng(w, h, rgba)
}
