import { describe, expect, it } from 'vitest'
import { baseGameFor, libretroThumbnailUrls, readHeader } from '../src/main/romHeader'

function withAscii(size: number, offset: number, text: string): Uint8Array {
  const buf = new Uint8Array(size)
  for (let i = 0; i < text.length; i++) buf[offset + i] = text.charCodeAt(i)
  return buf
}

describe('readHeader', () => {
  it('reconnaît un hack de Rouge Feu par son code GBA', () => {
    const info = readHeader('gba', withAscii(0xc0, 0xac, 'BPRE'))
    expect(info?.code).toBe('BPRE')
    expect(info?.base?.name).toBe('Rouge Feu')
  })

  it('ignore la lettre de région (version française)', () => {
    expect(readHeader('gba', withAscii(0xc0, 0xac, 'BPEF'))?.base?.name).toBe('Émeraude')
  })

  it('renvoie un code sans base pour un jeu GBA inconnu', () => {
    const info = readHeader('gba', withAscii(0xc0, 0xac, 'AGBJ'))
    expect(info?.code).toBe('AGBJ')
    expect(info?.base).toBeUndefined()
  })

  it('lit le titre interne GBC (Cristal)', () => {
    const buf = withAscii(0x150, 0x134, 'PM_CRYSTAL')
    buf.set([0x42, 0x59, 0x54, 0x45], 0x13f) // code fabricant BYTE
    buf[0x143] = 0xc0
    expect(readHeader('gbc', buf)?.base?.name).toBe('Cristal')
  })

  it('lit le code NDS (Noir 2)', () => {
    expect(readHeader('nds', withAscii(0x200, 0x0c, 'IREO'))?.base?.name).toBe('Noir 2')
  })

  it('refuse un fichier trop court', () => {
    expect(readHeader('gba', new Uint8Array(10))).toBeNull()
  })
})

describe('libretroThumbnailUrls', () => {
  it('encode le nom No-Intro dans les deux hôtes', () => {
    const urls = libretroThumbnailUrls(baseGameFor('gba', 'BPRE')!)
    expect(urls[0]).toBe(
      'https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy%20Advance/Named_Boxarts/Pokemon%20-%20FireRed%20Version%20(USA%2C%20Europe).png'
    )
    expect(urls[1]).toContain('raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/')
  })
})
