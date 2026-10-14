import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { NDS_BANNER_ICON_SIZE, ndsIconToPng } from '../src/main/ndsIcon'

describe('ndsIconToPng', () => {
  it('décode une icône unie en PNG 32×32', () => {
    const banner = new Uint8Array(NDS_BANNER_ICON_SIZE)
    banner.fill(0x11, 0x20, 0x220) // tous les pixels = couleur 1
    banner[0x222] = 0x1f // couleur 1 = rouge pur (BGR555)
    const png = ndsIconToPng(banner)!
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(32)
    // premier pixel après l'octet de filtre : rouge opaque
    const idat = png.indexOf('IDAT')
    const len = png.readUInt32BE(idat - 4)
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + len))
    expect([...raw.subarray(1, 5)]).toEqual([255, 0, 0, 255])
  })

  it("renvoie null pour une icône vide", () => {
    expect(ndsIconToPng(new Uint8Array(NDS_BANNER_ICON_SIZE))).toBeNull()
  })
})
