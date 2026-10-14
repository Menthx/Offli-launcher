import { crc32, deflateSync } from 'node:zlib'

/** Taille d'en-tête + bannière nécessaire, à partir de l'offset de bannière */
export const NDS_BANNER_ICON_SIZE = 0x240

export function ndsBannerOffset(header: Uint8Array): number {
  if (header.length < 0x6c) return 0
  return new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(0x68, true)
}

/**
 * Décode l'icône 32×32 d'une bannière NDS (4 bpp, tuiles 8×8, palette BGR555)
 * et renvoie un PNG. `banner` commence à l'offset de bannière.
 */
export function ndsIconToPng(banner: Uint8Array): Buffer | null {
  if (banner.length < NDS_BANNER_ICON_SIZE) return null
  const view = new DataView(banner.buffer, banner.byteOffset, banner.byteLength)
  const palette: [number, number, number, number][] = []
  for (let i = 0; i < 16; i++) {
    const c = view.getUint16(0x220 + i * 2, true)
    const s = (v: number): number => (v << 3) | (v >> 2)
    palette.push([s(c & 31), s((c >> 5) & 31), s((c >> 10) & 31), i === 0 ? 0 : 255])
  }
  const rgba = new Uint8Array(32 * 32 * 4)
  let nonEmpty = false
  for (let tile = 0; tile < 16; tile++) {
    const tx = (tile % 4) * 8
    const ty = Math.floor(tile / 4) * 8
    for (let p = 0; p < 64; p++) {
      const byte = banner[0x20 + tile * 32 + (p >> 1)]
      const idx = p & 1 ? byte >> 4 : byte & 15
      if (idx) nonEmpty = true
      const x = tx + (p % 8)
      const y = ty + Math.floor(p / 8)
      rgba.set(palette[idx], (y * 32 + x) * 4)
    }
  }
  return nonEmpty ? encodePng(32, 32, rgba) : null
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0))
  ])
}
