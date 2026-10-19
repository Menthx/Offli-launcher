import { createHash } from 'node:crypto'
import { open, readdir } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'
import type { Game, Platform } from '../shared/types'
import { type HashCache, identifyBaseRom } from './baseRoms'
import { headerSize, readHeader, toBaseRom } from './romHeader'
import { detectFangame, stem } from './scan/fangame'
import { groupVersions } from './scan/versions'

// Public scanner API (tests and main process)
export {
  type FangameInfo,
  type RgssIni,
  detectFangame,
  isPlaceholderTitle,
  parseRgssIni,
  pickFangameExe
} from './scan/fangame'
export { groupVersions, parseVersion } from './scan/versions'

const ROM_EXTENSIONS: Record<string, Platform> = {
  '.gb': 'gb',
  '.gbc': 'gbc',
  '.gba': 'gba',
  '.nds': 'nds',
  '.3ds': '3ds',
  '.cia': '3ds'
}

const MAX_DEPTH = 4

/** Game internals and side tools: never scanned */
const SKIP_DIRS = new Set(['data', 'graphics', 'pbs', 'plugins', 'audio', 'fonts', 'patcher'])

export function gameId(root: string, path: string): string {
  const rel = relative(root, path).replace(/\\/g, '/').toLowerCase()
  return createHash('sha1').update(rel).digest('hex').slice(0, 12)
}

export async function readRomHeader(
  path: string,
  platform: Platform,
  size = headerSize(platform)
): Promise<Uint8Array> {
  if (!size) return new Uint8Array(0)
  const fh = await open(path, 'r')
  try {
    const buf = Buffer.alloc(size)
    const { bytesRead } = await fh.read(buf, 0, size, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await fh.close()
  }
}

/** ROM named like its base game ('Pokemon - Emerald Version (USA, Europe) (patched).gba') */
export function isBaseLikeRomName(name: string): boolean {
  return /\(patched\)/i.test(name) || /^pok[eé]mon - .*(version|edition|edici[oó]n|versione)\b/i.test(name)
}

async function scanDir(root: string, dir: string, depth: number, out: Game[], hashes: HashCache): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  // A fangame folder is not scanned deeper
  const fangame = dir !== root ? await detectFangame(dir, files, dirs) : undefined
  if (fangame) {
    const path = join(dir, fangame.exe)
    out.push({
      id: gameId(root, path),
      name: fangame.title ?? basename(fangame.useParentName ? dirname(dir) : dir),
      kind: 'fangame',
      platform: 'pc',
      path,
      dir
    })
    return
  }

  for (const file of files) {
    const platform = ROM_EXTENSIONS[extname(file).toLowerCase()]
    if (!platform) continue
    const path = join(dir, file)
    let baseRom
    try {
      baseRom = toBaseRom(readHeader(platform, await readRomHeader(path, platform)))
    } catch {
      baseRom = undefined
    }
    let official: string | undefined
    try {
      official = platform === '3ds' ? undefined : await identifyBaseRom(path, hashes)
    } catch {
      official = undefined
    }
    if (official) {
      out.push({
        id: gameId(root, path),
        name: official,
        kind: 'baserom',
        platform,
        path,
        dir,
        baseRom
      })
      continue
    }
    out.push({
      id: gameId(root, path),
      // A patched ROM still named like its base game takes its folder name
      name: isBaseLikeRomName(stem(file)) && dir !== root ? basename(dir) : stem(file),
      kind: 'romhack',
      platform,
      path,
      dir,
      baseRom
    })
  }

  if (depth >= MAX_DEPTH) return
  for (const d of dirs) {
    if (!d.startsWith('.') && !SKIP_DIRS.has(d.toLowerCase())) await scanDir(root, join(dir, d), depth + 1, out, hashes)
  }
}

/** Scans several folders and merges them; ids stay relative to their folder, the second folder's id gets prefixed on collision */
export async function scanLibrary(roots: string | string[], hashes: HashCache = {}): Promise<Game[]> {
  const out: Game[] = []
  const seen = new Set<string>()
  for (const root of (Array.isArray(roots) ? roots : [roots]).filter(Boolean)) {
    const found: Game[] = []
    await scanDir(root, root, 0, found, hashes)
    for (const g of found) {
      const id = seen.has(g.id) ? createHash('sha1').update(`${root}\n${g.id}`).digest('hex').slice(0, 12) : g.id
      seen.add(id)
      out.push({ ...g, id })
    }
  }
  return groupVersions(out).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}
