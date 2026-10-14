import { createHash } from 'node:crypto'
import { open, readdir, readFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import type { Game, Platform } from '../shared/types'
import { headerSize, readHeader, toBaseRom } from './romHeader'

const ROM_EXTENSIONS: Record<string, Platform> = {
  '.gb': 'gb',
  '.gbc': 'gbc',
  '.gba': 'gba',
  '.nds': 'nds',
  '.3ds': '3ds',
  '.cia': '3ds'
}

const MAX_DEPTH = 4

export function gameId(root: string, path: string): string {
  const rel = relative(root, path).replace(/\\/g, '/').toLowerCase()
  return createHash('sha1').update(rel).digest('hex').slice(0, 12)
}

export async function readRomHeader(path: string, platform: Platform, size = headerSize(platform)): Promise<Uint8Array> {
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

/** Lit Title= dans Game.ini (RPG Maker), sinon undefined */
async function readGameIniTitle(dir: string, files: string[]): Promise<string | undefined> {
  const ini = files.find((f) => f.toLowerCase() === 'game.ini')
  if (!ini) return undefined
  try {
    const text = await readFile(join(dir, ini), 'utf8')
    const m = /^\s*Title\s*=\s*(.+?)\s*$/im.exec(text)
    return m?.[1] || undefined
  } catch {
    return undefined
  }
}

async function scanDir(root: string, dir: string, depth: number, out: Game[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  const files = entries.filter((e) => e.isFile()).map((e) => e.name)

  // Un dossier avec Game.exe est un fangame RPG Maker : on ne descend pas dedans
  const exe = files.find((f) => f.toLowerCase() === 'game.exe')
  if (exe && dir !== root) {
    const path = join(dir, exe)
    out.push({
      id: gameId(root, path),
      name: (await readGameIniTitle(dir, files)) ?? basename(dir),
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
    out.push({
      id: gameId(root, path),
      name: basename(file, extname(file)),
      kind: 'romhack',
      platform,
      path,
      dir,
      baseRom
    })
  }

  if (depth >= MAX_DEPTH) return
  for (const e of entries) {
    if (e.isDirectory() && !e.name.startsWith('.')) await scanDir(root, join(dir, e.name), depth + 1, out)
  }
}

export async function scanLibrary(root: string): Promise<Game[]> {
  if (!root) return []
  const out: Game[] = []
  await scanDir(root, root, 0, out)
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}
