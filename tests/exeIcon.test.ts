import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { dibToPng, exeIconPng, extractIcon, resourceEnd } from '../src/main/cover/exeIcon'
import { dib32, fakeExe } from './helpers/fakeExe'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

  it('ne lit que jusqu’à la fin des ressources, même avec des données ajoutées après', async () => {
    const exe = fakeExe(dib32(48), 48)
    expect(resourceEnd(exe)).toBe(exe.length)
    const dir = await mkdtemp(join(tmpdir(), 'offli-exe-'))
    try {
      const path = join(dir, 'Game.exe')
      await writeFile(path, Buffer.concat([exe, Buffer.alloc(2 * 1024 * 1024, 7)]))
      expect(pngSize((await exeIconPng(path))!)).toEqual([48, 48])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
