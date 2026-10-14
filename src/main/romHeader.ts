import type { BaseRom, Platform } from '../shared/types'

/** Jeu de base connu, avec les noms No-Intro utilisés par libretro-thumbnails (vérifiés sur le dépôt GitHub) */
export interface BaseGame {
  name: string
  /** Dossier libretro-thumbnails (ex. "Nintendo - Game Boy Advance") */
  system: string
  /** Noms de fichiers candidats, essayés dans l'ordre */
  thumbnails: string[]
}

const GB = 'Nintendo - Game Boy'
const GBC = 'Nintendo - Game Boy Color'
const GBA = 'Nintendo - Game Boy Advance'
const NDS = 'Nintendo - Nintendo DS'

/** Clé : 3 premiers caractères du code (la 4e lettre est la région) */
const GBA_GAMES: Record<string, BaseGame> = {
  BPR: { name: 'Rouge Feu', system: GBA, thumbnails: ['Pokemon - FireRed Version (USA, Europe)', 'Pokemon - FireRed Version (USA, Europe) (Rev 1)'] },
  BPG: { name: 'Vert Feuille', system: GBA, thumbnails: ['Pokemon - LeafGreen Version (USA, Europe)', 'Pokemon - LeafGreen Version (USA, Europe) (Rev 1)'] },
  BPE: { name: 'Émeraude', system: GBA, thumbnails: ['Pokemon - Emerald Version (USA, Europe)'] },
  AXV: { name: 'Rubis', system: GBA, thumbnails: ['Pokemon - Ruby Version (USA, Europe)', 'Pokemon - Ruby Version (USA, Europe) (Rev 2)'] },
  AXP: { name: 'Saphir', system: GBA, thumbnails: ['Pokemon - Sapphire Version (USA, Europe)', 'Pokemon - Sapphire Version (USA, Europe) (Rev 2)'] }
}

const NDS_GAMES: Record<string, BaseGame> = {
  ADA: { name: 'Diamant', system: NDS, thumbnails: ['Pokemon - Diamond Version (USA) (Rev 5)'] },
  APA: { name: 'Perle', system: NDS, thumbnails: ['Pokemon - Pearl Version (USA) (Rev 5)'] },
  CPU: { name: 'Platine', system: NDS, thumbnails: ['Pokemon - Platinum Version (USA)', 'Pokemon - Platinum Version (USA) (Rev 1)'] },
  IPK: { name: 'Or HeartGold', system: NDS, thumbnails: ['Pokemon - HeartGold Version (USA)'] },
  IPG: { name: 'Argent SoulSilver', system: NDS, thumbnails: ['Pokemon - SoulSilver Version (USA)'] },
  IRB: { name: 'Noir', system: NDS, thumbnails: ['Pokemon - Black Version (USA, Europe) (NDSi Enhanced)'] },
  IRA: { name: 'Blanc', system: NDS, thumbnails: ['Pokemon - White Version (USA, Europe) (NDSi Enhanced)'] },
  IRE: { name: 'Noir 2', system: NDS, thumbnails: ['Pokemon - Black Version 2 (USA, Europe) (NDSi Enhanced)'] },
  IRD: { name: 'Blanc 2', system: NDS, thumbnails: ['Pokemon - White Version 2 (USA, Europe) (NDSi Enhanced)'] }
}

/** Clé : titre interne GB/GBC (préfixe) */
const GB_GAMES: [string, BaseGame][] = [
  ['POKEMON RED', { name: 'Rouge', system: GB, thumbnails: ['Pokemon - Red Version (USA, Europe) (SGB Enhanced)'] }],
  ['POKEMON BLUE', { name: 'Bleu', system: GB, thumbnails: ['Pokemon - Blue Version (USA, Europe) (SGB Enhanced)'] }],
  ['POKEMON GREEN', { name: 'Vert', system: GB, thumbnails: ['Pocket Monsters - Midori (Japan) (Rev 1) (SGB Enhanced)', 'Pocket Monsters - Midori (Japan) (SGB Enhanced)'] }],
  ['POKEMON YELLOW', { name: 'Jaune', system: GB, thumbnails: ['Pokemon - Yellow Version - Special Pikachu Edition (USA, Europe) (CGB+SGB Enhanced)'] }],
  ['POKEMON_GLD', { name: 'Or', system: GBC, thumbnails: ['Pokemon - Gold Version (USA, Europe) (SGB Enhanced) (GB Compatible)'] }],
  ['POKEMON_SLV', { name: 'Argent', system: GBC, thumbnails: ['Pokemon - Silver Version (USA, Europe) (SGB Enhanced) (GB Compatible)'] }],
  ['PM_CRYSTAL', { name: 'Cristal', system: GBC, thumbnails: ['Pokemon - Crystal Version (USA, Europe) (Rev 1)', 'Pokemon - Crystal Version (USA, Europe)'] }]
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

/** Octets d'en-tête à lire selon la plateforme (on ne lit jamais la ROM entière) */
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
    // Titre sur 0x134–0x143 ; sur GBC les derniers octets peuvent être un code fabricant ou le drapeau CGB
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
  // libretro remplace &*/:`<>?\| par _ dans les noms de fichiers
  const safe = (s: string): string => s.replace(/[&*/:`<>?\\|]/g, '_')
  // Deux hôtes : le serveur libretro, puis le miroir GitHub du même dépôt
  const repo = base.system.replace(/ /g, '_')
  return base.thumbnails.flatMap((t) => {
    const file = encodeURIComponent(safe(t))
    return [
      `https://thumbnails.libretro.com/${encodeURIComponent(base.system)}/Named_Boxarts/${file}.png`,
      `https://raw.githubusercontent.com/libretro-thumbnails/${repo}/master/Named_Boxarts/${file}.png`
    ]
  })
}
