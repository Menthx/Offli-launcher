import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import type { DetectedLink, Game } from '../../shared/types'
import { iconName } from '../../shared/linkIcons'
import { linkKind } from '../../shared/links'
import { OFFLI_MD, type OffliLink, parseOffliMd, parseUrlShortcut } from './offliMd'

const TEXT_EXT = new Set(['.txt', '.md', '.url', '.html', '.htm', '.nfo', '.ini'])
const MAX_FILE_BYTES = 512 * 1024
const MAX_FILES = 40

const DISCORD =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/[\w-]+|discord(?:app)?\.com\/(?:invite\/[\w-]+|channels\/\d+(?:\/\d+)?))/gi
const WIKI = /https?:\/\/[^\s"'<>()[\]]*(?:wiki|fandom\.com|bulbapedia)[^\s"'<>()[\]]*/gi

/** Discord invites and channels, and wiki pages, in order of appearance */
export function findLinks(text: string): string[] {
  const found: { at: number; url: string }[] = []
  for (const m of text.matchAll(DISCORD)) {
    const url = /^https?:/i.test(m[0]) ? m[0] : `https://${m[0]}`
    found.push({ at: m.index, url: url.replace(/^http:/i, 'https:') })
  }
  for (const m of text.matchAll(WIKI)) {
    const url = m[0].replace(/[.,;:!?]+$/, '')
    if (linkKind(url) === 'wiki') found.push({ at: m.index, url })
  }
  const seen = new Set<string>()
  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => f.url)
    .filter((u) => !seen.has(u.toLowerCase()) && !!seen.add(u.toLowerCase()))
}

/** Fangame: text files at the top of its folder, offli.md first; ROM: only files named like it (the folder holds other ROMs) */
async function candidates(game: Game): Promise<string[]> {
  const entries = await readdir(game.dir).catch(() => [] as string[])
  const stem = basename(game.path, extname(game.path)).toLowerCase()
  return entries
    .filter((f) => TEXT_EXT.has(extname(f).toLowerCase()))
    .filter((f) => game.kind === 'fangame' || f.toLowerCase().startsWith(stem))
    .sort((a, b) => Number(b.toLowerCase() === OFFLI_MD) - Number(a.toLowerCase() === OFFLI_MD))
    .slice(0, MAX_FILES)
    .map((f) => join(game.dir, f))
}

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
  '.gif': 'gif'
}
export const MAX_ICON_BYTES = 128 * 1024

/** Icon name as is; image file of the game folder (never outside it) as a data URL; anything else dropped */
export async function resolveIcon(icon: string, dir: string): Promise<string | undefined> {
  const name = iconName(icon)
  if (name) return name
  const type = IMAGE_TYPES[extname(icon).toLowerCase()]
  const path = resolve(dir, icon)
  const rel = relative(dir, path)
  if (!type || rel.startsWith('..') || resolve(rel) === rel) return undefined
  const info = await stat(path).catch(() => null)
  if (!info?.isFile() || info.size > MAX_ICON_BYTES) return undefined
  const data = await readFile(path).catch(() => null)
  return data ? `data:image/${type};base64,${data.toString('base64')}` : undefined
}

async function withIcons(links: OffliLink[], dir: string): Promise<OffliLink[]> {
  return Promise.all(
    links.map(async ({ icon, ...link }) => {
      const resolved = icon ? await resolveIcon(icon, dir) : undefined
      return resolved ? { ...link, icon: resolved } : link
    })
  )
}

/** offli.md: its "Liens" section (named, every site); .url shortcut: its address; other files: Discord and wiki links */
async function linksIn(path: string, dir: string): Promise<OffliLink[]> {
  const name = basename(path)
  const md = name.toLowerCase() === OFFLI_MD
  const text = await readFile(path, md ? 'utf8' : 'latin1').catch(() => '')
  if (md) return withIcons(parseOffliMd(text), dir)
  if (extname(name).toLowerCase() === '.url') {
    const link = parseUrlShortcut(text, name)
    return link ? [link] : []
  }
  return findLinks(text).map((url) => ({ url }))
}

export async function detectLinks(games: Game[]): Promise<DetectedLink[]> {
  const out: DetectedLink[] = []
  const seen = new Set<string>()
  for (const game of games) {
    for (const path of await candidates(game)) {
      const info = await stat(path).catch(() => null)
      if (!info?.isFile() || info.size > MAX_FILE_BYTES) continue
      for (const link of await linksIn(path, game.dir)) {
        if (seen.has(link.url)) continue
        seen.add(link.url)
        out.push({ ...link, file: basename(path) })
      }
    }
  }
  return out
}
