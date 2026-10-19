import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { dibToPng, extractIcon } from '../src/main/cover/exeIcon'

/** 32-bit w×w BMP icon: opaque red on the left, transparent on the right */
function dib32(w: number): Buffer {
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(w, 4)
  header.writeInt32LE(w * 2, 8)
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  const px = Buffer.alloc(w * w * 4)
  for (let i = 0; i < w * w; i++) if (i % w < w / 2) px.set([0, 0, 255, 255], i * 4)
  return Buffer.concat([header, px, Buffer.alloc(((w + 31) >> 5) * 4 * w)])
}

/** Minimal PE32+ with a .rsrc section: RT_ICON #1 and an RT_GROUP_ICON pointing to it */
function fakeExe(icon: Buffer, size: number): Buffer {
  const group = Buffer.alloc(6 + 14)
  group.writeUInt16LE(1, 2)
  group.writeUInt16LE(1, 4)
  group[6] = size === 256 ? 0 : size
  group[7] = group[6]
  group.writeUInt16LE(32, 12)
  group.writeUInt32LE(icon.length, 14)
  group.writeUInt16LE(1, 18)

  const RVA = 0x1000
  const rsrc = Buffer.alloc(0x200 + icon.length + group.length)
  const dir = (at: number, items: [number, number][]): void => {
    rsrc.writeUInt16LE(items.length, at + 14)
    items.forEach(([id, off], i) => {
      rsrc.writeUInt32LE(id, at + 16 + i * 8)
      rsrc.writeUInt32LE(off >>> 0, at + 20 + i * 8)
    })
  }
  const SUB = 0x80000000
  dir(0, [
    [3, SUB | 0x20],
    [14, SUB | 0x38]
  ])
  dir(0x20, [[1, SUB | 0x50]])
  dir(0x38, [[1, SUB | 0x68]])
  dir(0x50, [[0, 0x80]])
  dir(0x68, [[0, 0x90]])
  rsrc.writeUInt32LE(RVA + 0x200, 0x80)
  rsrc.writeUInt32LE(icon.length, 0x84)
  rsrc.writeUInt32LE(RVA + 0x200 + icon.length, 0x90)
  rsrc.writeUInt32LE(group.length, 0x94)
  icon.copy(rsrc, 0x200)
  group.copy(rsrc, 0x200 + icon.length)

  const head = Buffer.alloc(0x400)
  head.write('MZ', 0, 'ascii')
  head.writeUInt32LE(0x40, 0x3c)
  head.write('PE\0\0', 0x40, 'ascii')
  head.writeUInt16LE(1, 0x40 + 6)
  head.writeUInt16LE(240, 0x40 + 20)
  const opt = 0x40 + 24
  head.writeUInt16LE(0x20b, opt)
  head.writeUInt32LE(RVA, opt + 112 + 16)
  const sec = opt + 240
  head.writeUInt32LE(rsrc.length, sec + 8)
  head.writeUInt32LE(RVA, sec + 12)
  head.writeUInt32LE(rsrc.length, sec + 16)
  head.writeUInt32LE(0x400, sec + 20)
  return Buffer.concat([head, rsrc])
}

const pngSize = (png: Buffer): [number, number] => [png.readUInt32BE(16), png.readUInt32BE(20)]

describe('icône des exécutables', () => {
  it('convertit une icône BMP 32 bits en PNG avec sa transparence', () => {
    const png = extractIcon(fakeExe(dib32(32), 32))!
    expect(png.toString('hex', 0, 8)).toBe('89504e470d0a1a0a')
    expect(pngSize(png)).toEqual([32, 32])
    const idat = png.subarray(png.indexOf('IDAT') + 4, png.indexOf('IEND') - 8)
    const raw = inflateSync(idat)
    // First row: filter byte, then RGBA
    expect([...raw.subarray(1, 5)]).toEqual([255, 0, 0, 255])
    expect(raw[1 + 31 * 4 + 3]).toBe(0)
  })

  it('renvoie telle quelle une icône déjà en PNG', () => {
    const png = dibToPng(dib32(16))!
    expect(extractIcon(fakeExe(png, 256))!.equals(png)).toBe(true)
  })

  it('ignore un fichier qui n’est pas un exécutable ou sans icône', () => {
    expect(extractIcon(Buffer.from('pas un exe'))).toBeNull()
    const noRsrc = fakeExe(dib32(16), 16)
    noRsrc.writeUInt32LE(0, 0x40 + 24 + 112 + 16)
    expect(extractIcon(noRsrc)).toBeNull()
  })
})
