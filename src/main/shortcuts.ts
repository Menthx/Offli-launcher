import { app, shell } from 'electron'
import { chmod, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { t } from '../shared/i18n'
import type { Game, GameStats } from '../shared/types'

/** `--launch <id>` or `--launch=<id>` on the command line */
export function parseLaunchArg(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a.startsWith('--launch=')) return a.slice('--launch='.length) || undefined
    if (a === '--launch') return argv[i + 1]
  }
  return undefined
}

/** The program a shortcut runs: the portable .exe or the AppImage, not their temporary copy */
export function appTarget(env: NodeJS.ProcessEnv = process.env): string {
  return env['PORTABLE_EXECUTABLE_FILE'] || env['APPIMAGE'] || process.execPath
}

/** In development, Electron also needs the app folder */
export const launchArgs = (id: string): string[] =>
  app.isPackaged ? ['--launch', id] : [app.getAppPath(), '--launch', id]

/** Quoting of a .desktop Exec line */
const quote = (s: string): string => (/[\s"`$\\]/.test(s) ? `"${s.replace(/(["\\`$])/g, '\\$1')}"` : s)
/** Windows command line (ids and paths never contain quotes) */
const winArgs = (args: string[]): string => args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')

/** Linux .desktop file that launches a game through Offli */
export function desktopEntry(name: string, target: string, args: string[], icon?: string): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${name.replace(/\n/g, ' ')}`,
    `Exec=${[target, ...args].map(quote).join(' ')}`,
    `Icon=${icon ?? 'offli-launcher'}`,
    'Terminal=false',
    'Categories=Game;',
    ''
  ].join('\n')
}

/** File name without the characters Windows and Linux refuse */
export const safeFileName = (name: string): string =>
  name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Offli'

export async function createDesktopShortcut(game: Game): Promise<{ ok: boolean; error?: string }> {
  const file = join(app.getPath('desktop'), safeFileName(game.name))
  const args = launchArgs(game.id)
  try {
    if (process.platform === 'win32') {
      const ok = shell.writeShortcutLink(`${file}.lnk`, {
        target: appTarget(),
        args: winArgs(args),
        description: game.name,
        // A fangame shows its own icon
        icon: game.kind === 'fangame' ? game.path : appTarget(),
        iconIndex: 0
      })
      return ok ? { ok: true } : { ok: false, error: t('main.shortcutFailed') }
    }
    if (process.platform === 'linux') {
      await writeFile(`${file}.desktop`, desktopEntry(game.name, appTarget(), args))
      await chmod(`${file}.desktop`, 0o755)
      return { ok: true }
    }
    return { ok: false, error: t('main.shortcutUnsupported') }
  } catch {
    return { ok: false, error: t('main.shortcutFailed') }
  }
}

/** Number of recent games in the taskbar menu */
const JUMP_LIST_SIZE = 6

/** Windows: right click on the taskbar icon lists the last played games */
export function updateJumpList(games: Game[], stats: Record<string, GameStats>): void {
  if (process.platform !== 'win32') return
  const recent = games
    .flatMap((g) => g.versions ?? [g])
    .filter((g) => stats[g.id]?.lastPlayed)
    .sort((a, b) => stats[b.id]!.lastPlayed! - stats[a.id]!.lastPlayed!)
    .slice(0, JUMP_LIST_SIZE)
  const items = recent.map((g) => ({
    type: 'task' as const,
    program: appTarget(),
    args: winArgs(launchArgs(g.id)),
    title: g.variant ? `${g.name} (${g.variant})` : g.name,
    description: t('main.jumpListPlay', { name: g.name }),
    iconPath: g.kind === 'fangame' ? g.path : appTarget(),
    iconIndex: 0
  }))
  // Own "Last played" section; Windows refuses it when recent items are turned off in its settings
  const result = app.setJumpList(items.length ? [{ type: 'custom', name: t('main.jumpListTitle'), items }] : null)
  if (result !== 'ok')
    app.setUserTasks(items.map(({ args, ...i }) => ({ ...i, arguments: args })).map(({ type: _t, ...i }) => i))
}
