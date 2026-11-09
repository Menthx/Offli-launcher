import { readFile, readdir } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import type { GameExe } from '../../shared/types'

/** Executables that aren't the game itself */
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

export const stem = (file: string): string => basename(file, extname(file))

/** UTF-8, or Latin-1 when invalid (old RPG Maker .ini) */
export async function readText(path: string): Promise<string | undefined> {
  try {
    const buf = await readFile(path)
    const utf8 = buf.toString('utf8')
    return utf8.includes('�') ? buf.toString('latin1') : utf8
  } catch {
    return undefined
  }
}

/** Empty, 'Untitled' or a technical id (infinitefusion-hoenn) */
export function isPlaceholderTitle(title: string | undefined): boolean {
  if (!title?.trim()) return true
  return /^untitled$/i.test(title.trim()) || /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/.test(title.trim())
}

/** Pokémon SDK project title (project.studio) */
async function readStudioTitle(dir: string, file: string | undefined): Promise<string | undefined> {
  if (!file) return undefined
  try {
    const title = (
      JSON.parse((await readText(join(dir, file))) ?? '{}') as {
        title?: unknown
      }
    ).title
    return typeof title === 'string' && !isPlaceholderTitle(title) ? title.trim() : undefined
  } catch {
    return undefined
  }
}

export interface RgssIni {
  file: string
  title?: string
}

/** RPG Maker XP/VX .ini: [Game] section with Library=RGSS… */
export function parseRgssIni(file: string, text: string): RgssIni | undefined {
  if (!/^\s*\[Game\]/im.test(text) || !/^\s*Library\s*=\s*RGSS/im.test(text)) return undefined
  const title = /^\s*Title\s*=\s*(.+?)\s*$/im.exec(text)?.[1]
  return { file, title: title || undefined }
}

const byLowerName = (files: string[]): Map<string, string> => new Map(files.map((f) => [f.toLowerCase(), f]))

/** Exe named like an RPG Maker .ini (Fallen.ini → Fallen.exe), else Game.exe, else the only non-tool .exe */
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
  exe: string
  /** Title read from the .ini, if any */
  title?: string
  /** Name the game after the parent folder (launcher installs, e.g. Regis/app) */
  useParentName?: boolean
  /** Performance build or launcher, offered instead of exe */
  alternates?: GameExe[]
}

/** Updater launcher (PatchKit, Pokémon Studio…): Launcher.exe only, not its translated copies */
const isLauncher = (f: string): boolean => /^launcher\.exe$/i.test(f)

/** InfiniteFusion2-performance.exe next to InfiniteFusion2.exe, and Launcher.exe in the folder (or its parent for app/ installs) */
export function findAlternates(dir: string, files: string[], exe: string, parentFiles: string[] = []): GameExe[] {
  const out: GameExe[] = []
  const perf = files.find((f) => f.toLowerCase() === `${stem(exe).toLowerCase()}-performance.exe`)
  if (perf) out.push({ path: join(dir, perf), kind: 'performance' })
  const here = files.find(isLauncher)
  const parent = parentFiles.find(isLauncher)
  if (here) out.push({ path: join(dir, here), kind: 'launcher' })
  else if (parent) out.push({ path: join(dirname(dir), parent), kind: 'launcher' })
  return out
}

const withAlternates = (info: FangameInfo, dir: string, files: string[], parentFiles: string[] = []): FangameInfo => {
  const alternates = findAlternates(dir, files, info.exe, parentFiles)
  return alternates.length ? { ...info, alternates } : info
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name)
  } catch {
    return []
  }
}

/** Fangame folder: launcher app_data.json, RPG Maker .ini, Data/ + RGSS*.dll, Pokémon SDK project.studio, or Game.exe */
export async function detectFangame(dir: string, files: string[], dirs: string[]): Promise<FangameInfo | undefined> {
  const names = byLowerName(files)

  const appData = names.get('app_data.json')
  if (appData) {
    try {
      const data = JSON.parse((await readText(join(dir, appData))) ?? '{}') as {
        start_exe_path?: unknown
      }
      const start = typeof data.start_exe_path === 'string' ? names.get(data.start_exe_path.toLowerCase()) : undefined
      if (start) return withAlternates({ exe: start, useParentName: true }, dir, files, await listFiles(dirname(dir)))
    } catch {
      // Unreadable app_data.json: try the other rules
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
  if (!inis.length && !(hasData && hasRgssDll) && !names.has('project.studio') && !names.has('game.exe'))
    return undefined

  const exe = pickFangameExe(files, inis)
  if (!exe) return undefined
  // The Pokémon SDK title wins over the .ini one (often 'Untitled')
  const ini = inis.find((i) => stem(i.file).toLowerCase() === stem(exe).toLowerCase()) ?? inis[0]
  const title =
    (await readStudioTitle(dir, names.get('project.studio'))) ??
    (isPlaceholderTitle(ini?.title) ? undefined : ini?.title)
  return withAlternates({ exe, title }, dir, files)
}
