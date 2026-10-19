import type { BaseRom, Platform } from '../shared/types'

/** Known base game, with the No-Intro names used by libretro-thumbnails */
export interface BaseGame {
  name: string
  /** libretro-thumbnails folder (e.g. 'Nintendo - Game Boy Advance') */
  system: string
  /** Candidate file names, tried in order */
  thumbnails: string[]
}

const GB = 'Nintendo - Game Boy'
const GBC = 'Nintendo - Game Boy Color'
const GBA = 'Nintendo - Game Boy Advance'
const NDS = 'Nintendo - Nintendo DS'

const base = (name: string, system: string, ...thumbnails: string[]): BaseGame => ({ name, system, thumbnails })
const usa = (game: string, rev = ''): string => `Pokemon - ${game} (USA, Europe)${rev}`

/** Key: first 3 chars of the code (the 4th is the region) */
const GBA_GAMES: Record<string, BaseGame> = {
  BPR: base('Rouge Feu', GBA, usa('FireRed Version'), usa('FireRed Version', ' (Rev 1)')),
  BPG: base('Vert Feuille', GBA, usa('LeafGreen Version'), usa('LeafGreen Version', ' (Rev 1)')),
  BPE: base('Émeraude', GBA, usa('Emerald Version')),
  AXV: base('Rubis', GBA, usa('Ruby Version'), usa('Ruby Version', ' (Rev 2)')),
  AXP: base('Saphir', GBA, usa('Sapphire Version'), usa('Sapphire Version', ' (Rev 2)'))
}

const NDS_GAMES: Record<string, BaseGame> = {
  ADA: base('Diamant', NDS, 'Pokemon - Diamond Version (USA) (Rev 5)'),
  APA: base('Perle', NDS, 'Pokemon - Pearl Version (USA) (Rev 5)'),
  CPU: base('Platine', NDS, 'Pokemon - Platinum Version (USA)', 'Pokemon - Platinum Version (USA) (Rev 1)'),
  IPK: base('Or HeartGold', NDS, 'Pokemon - HeartGold Version (USA)'),
  IPG: base('Argent SoulSilver', NDS, 'Pokemon - SoulSilver Version (USA)'),
  IRB: base('Noir', NDS, usa('Black Version', ' (NDSi Enhanced)')),
  IRA: base('Blanc', NDS, usa('White Version', ' (NDSi Enhanced)')),
  IRE: base('Noir 2', NDS, usa('Black Version 2', ' (NDSi Enhanced)')),
  IRD: base('Blanc 2', NDS, usa('White Version 2', ' (NDSi Enhanced)'))
}

const SGB = ' (SGB Enhanced)'
const GBC_COMPAT = ' (SGB Enhanced) (GB Compatible)'

/** Key: GB/GBC internal title prefix */
const GB_GAMES: [string, BaseGame][] = [
  ['POKEMON RED', base('Rouge', GB, usa('Red Version', SGB))],
  ['POKEMON BLUE', base('Bleu', GB, usa('Blue Version', SGB))],
  [
    'POKEMON GREEN',
    base('Vert', GB, 'Pocket Monsters - Midori (Japan) (Rev 1)' + SGB, 'Pocket Monsters - Midori (Japan)' + SGB)
  ],
  ['POKEMON YELLOW', base('Jaune', GB, usa('Yellow Version - Special Pikachu Edition', ' (CGB+SGB Enhanced)'))],
  ['POKEMON_GLD', base('Or', GBC, usa('Gold Version', GBC_COMPAT))],
  ['POKEMON_SLV', base('Argent', GBC, usa('Silver Version', GBC_COMPAT))],
  ['PM_CRYSTAL', base('Cristal', GBC, usa('Crystal Version', ' (Rev 1)'), usa('Crystal Version'))]
]

function ascii(buf: Uint8Array, start: number, len: number): string {
  let s = ''
  for (let i = start; i < start + len && i < buf.length; i++) {
    const c = buf[i]
    if (c === 0) break
    s += c >= 0x20 && c < 0x7f ? String.fromCharCode(c) : ''
  }
  return s.trim()
}

/** Header bytes to read per platform (never the whole ROM) */
export function headerSize(platform: Platform): number {
  return platform === 'nds' ? 0x200 : platform === 'gba' ? 0xc0 : platform === 'gb' || platform === 'gbc' ? 0x150 : 0
}

export interface HeaderInfo {
  code: string
  base?: BaseGame
}

export function readHeader(platform: Platform, buf: Uint8Array): HeaderInfo | null {
  if (platform === 'gba') {
    if (buf.length < 0xb0) return null
    const code = ascii(buf, 0xac, 4)
    if (code.length !== 4) return null
    return { code, base: GBA_GAMES[code.slice(0, 3)] }
  }
  if (platform === 'nds') {
    if (buf.length < 0x10) return null
    const code = ascii(buf, 0x0c, 4)
    if (code.length !== 4) return null
    return { code, base: NDS_GAMES[code.slice(0, 3)] }
  }
  if (platform === 'gb' || platform === 'gbc') {
    if (buf.length < 0x144) return null
    // Title at 0x134–0x143; on GBC the last bytes may be a maker code or the CGB flag
    const title = ascii(buf, 0x134, 16)
    if (!title) return null
    const hit = GB_GAMES.find(([prefix]) => title.startsWith(prefix))
    return { code: title, base: hit?.[1] }
  }
  return null
}

export function toBaseRom(info: HeaderInfo | null): BaseRom | undefined {
  return info?.base ? { code: info.code, name: info.base.name } : undefined
}

export function baseGameFor(platform: Platform, code: string): BaseGame | undefined {
  if (platform === 'gba') return GBA_GAMES[code.slice(0, 3)]
  if (platform === 'nds') return NDS_GAMES[code.slice(0, 3)]
  if (platform === 'gb' || platform === 'gbc') return GB_GAMES.find(([p]) => code.startsWith(p))?.[1]
  return undefined
}

export function libretroThumbnailUrls(base: BaseGame): string[] {
  // libretro replaces &*/:`<>?\| with _ in file names
  const safe = (s: string): string => s.replace(/[&*/:`<>?\\|]/g, '_')
  // libretro server first, then its GitHub mirror
  const repo = base.system.replace(/ /g, '_')
  return base.thumbnails.flatMap((t) => {
    const file = encodeURIComponent(safe(t))
    return [
      `https://thumbnails.libretro.com/${encodeURIComponent(base.system)}/Named_Boxarts/${file}.png`,
      `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/Named_Boxarts/${file}.png`
    ]
  })
}
