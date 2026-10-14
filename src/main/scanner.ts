import { createHash } from 'node:crypto'
import { open, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative } from 'node:path'
import type { Game, Platform } from '../shared/types'
import { type HashCache, identifyBaseRom } from './baseRoms'
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

/** Dossiers internes d'un jeu ou outils annexes : jamais parcourus */
const SKIP_DIRS = new Set(['data', 'graphics', 'pbs', 'plugins', 'audio', 'fonts', 'patcher'])

/** Exécutables qui ne sont pas le jeu lui-même */
const IGNORED_EXE = [
  /-performance\.exe$/i,
  /^unins.*\.exe$/i,
  /^uninstall\.exe$/i,
  /^mapmaker\.exe$/i,
  /^rubyw?\.exe$/i,
  /^launcher.*\.exe$/i,
  /^patchkit.*\.exe$/i,
  /^pkhex\.exe$/i
]

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

/** Lit un fichier texte en UTF-8, ou en Latin-1 s'il n'est pas de l'UTF-8 valide (vieux .ini RPG Maker) */
async function readText(path: string): Promise<string | undefined> {
  try {
    const buf = await readFile(path)
    const utf8 = buf.toString('utf8')
    return utf8.includes('�') ? buf.toString('latin1') : utf8
  } catch {
    return undefined
  }
}

/** Titre inutilisable : vide, « Untitled » ou identifiant technique (infinitefusion-hoenn) */
export function isPlaceholderTitle(title: string | undefined): boolean {
  if (!title?.trim()) return true
  return /^untitled$/i.test(title.trim()) || /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/.test(title.trim())
}

/** Titre d'un projet Pokémon SDK (project.studio) */
async function readStudioTitle(dir: string, file: string | undefined): Promise<string | undefined> {
  if (!file) return undefined
  try {
    const title = (JSON.parse((await readText(join(dir, file))) ?? '{}') as { title?: unknown }).title
    return typeof title === 'string' && !isPlaceholderTitle(title) ? title.trim() : undefined
  } catch {
    return undefined
  }
}

/** ROM nommée comme le jeu de base (« Pokemon - Emerald Version (USA, Europe) (patched).gba ») */
export function isBaseLikeRomName(name: string): boolean {
  return /\(patched\)/i.test(name) || /^pok[eé]mon - .*(version|edition|edici[oó]n|versione)\b/i.test(name)
}

export interface RgssIni {
  file: string
  title?: string
}

/** .ini RPG Maker XP/VX : section [Game] avec Library=RGSS… */
export function parseRgssIni(file: string, text: string): RgssIni | undefined {
  if (!/^\s*\[Game\]/im.test(text) || !/^\s*Library\s*=\s*RGSS/im.test(text)) return undefined
  const title = /^\s*Title\s*=\s*(.+?)\s*$/im.exec(text)?.[1]
  return { file, title: title || undefined }
}

const byLowerName = (files: string[]): Map<string, string> => new Map(files.map((f) => [f.toLowerCase(), f]))
const stem = (file: string): string => basename(file, extname(file))

/**
 * Choisit l'exécutable d'un fangame : celui qui porte le nom d'un .ini RPG Maker
 * (Fallen.ini → Fallen.exe), sinon Game.exe, sinon le seul .exe restant une fois
 * les outils écartés (InfiniteFusion2.exe).
 */
export function pickFangameExe(files: string[], inis: RgssIni[]): string | undefined {
  const names = byLowerName(files)
  for (const ini of inis) {
    const exe = names.get(stem(ini.file).toLowerCase() + '.exe')
    if (exe) return exe
  }
  const game = names.get('game.exe')
  if (game) return game
  const rest = files.filter((f) => extname(f).toLowerCase() === '.exe' && !IGNORED_EXE.some((r) => r.test(f)))
  return rest.length === 1 ? rest[0] : undefined
}

export interface FangameInfo {
  /** Exécutable, dans le dossier scanné */
  exe: string
  /** Titre lu dans le .ini, s'il y en a un */
  title?: string
  /** Nommer le jeu d'après le dossier parent (jeu installé par un launcher, ex. Regis/app) */
  useParentName?: boolean
}

/**
 * Reconnaît un fangame dans un dossier :
 * - un dossier piloté par un launcher (app_data.json avec start_exe_path) ;
 * - un .ini RPG Maker (Library=RGSS…), Data/ avec une RGSS*.dll, ou un projet Pokémon SDK (project.studio) ;
 * - à défaut, un Game.exe.
 */
export async function detectFangame(dir: string, files: string[], dirs: string[]): Promise<FangameInfo | undefined> {
  const names = byLowerName(files)

  const appData = names.get('app_data.json')
  if (appData) {
    try {
      const data = JSON.parse((await readText(join(dir, appData))) ?? '{}') as { start_exe_path?: unknown }
      const start = typeof data.start_exe_path === 'string' ? names.get(data.start_exe_path.toLowerCase()) : undefined
      if (start) return { exe: start, useParentName: true }
    } catch {
      // app_data.json illisible : on continue avec les autres règles
    }
  }

  const inis: RgssIni[] = []
  for (const f of files.filter((f) => extname(f).toLowerCase() === '.ini')) {
    const text = await readText(join(dir, f))
    const ini = text ? parseRgssIni(f, text) : undefined
    if (ini) inis.push(ini)
  }
  const hasData = dirs.some((d) => d.toLowerCase() === 'data')
  const hasRgssDll = files.some((f) => /^rgss.*\.dll$/i.test(f))
  if (!inis.length && !(hasData && hasRgssDll) && !names.has('project.studio') && !names.has('game.exe')) return undefined

  const exe = pickFangameExe(files, inis)
  if (!exe) return undefined
  // Le titre du projet Pokémon SDK passe avant celui du .ini (souvent « Untitled »)
  const ini = inis.find((i) => stem(i.file).toLowerCase() === stem(exe).toLowerCase()) ?? inis[0]
  const title = (await readStudioTitle(dir, names.get('project.studio'))) ?? (isPlaceholderTitle(ini?.title) ? undefined : ini?.title)
  return { exe, title }
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

  // Un dossier de fangame n'est pas parcouru plus loin
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
      out.push({ id: gameId(root, path), name: official, kind: 'baserom', platform, path, dir, baseRom })
      continue
    }
    out.push({
      id: gameId(root, path),
      // Une ROM patchée qui garde le nom du jeu de base prend le nom de son dossier
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

/** Version lue dans un nom de dossier : « (Fr 1.1.3) » d'abord, sinon le dernier numéro x.y[.z] */
export function parseVersion(folder: string): number[] {
  const m = /\(\s*fr\s*(\d+(?:\.\d+)*)\s*\)/i.exec(folder) ?? /(\d+(?:\.\d+)+)(?!.*\d+\.\d)/.exec(folder)
  return m ? m[1].split('.').map(Number) : []
}

function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d) return d
  }
  return 0
}

/**
 * Regroupe les fangames de même nom (plusieurs dossiers PokeFallen) : une seule
 * entrée, la version la plus récente, avec les autres dans `versions`.
 */
export function groupVersions(games: Game[]): Game[] {
  const groups = new Map<string, Game[]>()
  const out: Game[] = []
  for (const g of games) {
    if (g.kind !== 'fangame') {
      out.push(g)
      continue
    }
    const key = g.name.toLowerCase()
    groups.set(key, [...(groups.get(key) ?? []), g])
  }
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0])
      continue
    }
    const versions = list
      .map((g) => ({ ...g, variant: basename(g.dir) }))
      .sort(
        (a, b) =>
          compareVersions(parseVersion(b.variant), parseVersion(a.variant)) ||
          a.variant.length - b.variant.length ||
          a.variant.localeCompare(b.variant, 'fr')
      )
    out.push({ ...versions[0], versions })
  }
  return out
}

export async function scanLibrary(root: string, hashes: HashCache = {}): Promise<Game[]> {
  if (!root) return []
  const out: Game[] = []
  await scanDir(root, root, 0, out, hashes)
  return groupVersions(out).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}
