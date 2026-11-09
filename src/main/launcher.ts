import { execFile, spawn } from 'node:child_process'
import { dirname, extname } from 'node:path'
import { t } from '../shared/i18n'
import type { Game, Settings } from '../shared/types'
import { windowsRunner } from './runners'

export interface Command {
  cmd: string
  args: string[]
  cwd: string
  /** Windows: replaced by the associated app (see resolveAssociation) */
  openWith?: string
  /** Extra environment (Proton) */
  env?: Record<string, string>
  /** The game's .exe when a runner (Wine, Proton…) starts it: the process to look for later */
  exeHint?: string
  /** Play time: 'exit' = process lifetime, 'none' = not tracked, 'default-app' = counted only if waiting worked */
  playtime?: 'exit' | 'none' | 'default-app'
}

/** Below this, the default app returned without waiting for the game */
export const MIN_DEFAULT_APP_SESSION_SEC = 15

/** Opens a file with the system's associated app (Windows: run directly when possible, so play time can be tracked) */
export function defaultAppCommand(path: string, cwd: string, os: NodeJS.Platform): Command {
  if (os === 'win32')
    return {
      cmd: 'explorer.exe',
      args: [path],
      cwd,
      playtime: 'none',
      openWith: path
    }
  if (os === 'darwin') return { cmd: 'open', args: ['-W', path], cwd, playtime: 'default-app' }
  return { cmd: 'xdg-open', args: [path], cwd, playtime: 'none' }
}

/** Splits a Windows association command and inserts the file (%1 / %L = path, other variables removed) */
export function parseAssocCommand(template: string, file: string): { cmd: string; args: string[] } | undefined {
  const tokens = [...template.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2])
  const [cmd, ...rest] = tokens
  if (!cmd) return undefined
  const args = rest.map((a) => a.replace(/%[1L]/gi, file)).filter((a) => !/%[*\w]/.test(a) || a.includes(file))
  if (!rest.some((a) => /%[1L]/i.test(a))) args.push(file)
  return { cmd, args }
}

const assocCache = new Map<string, Promise<string | undefined>>()

/** Cached AssocQueryString lookup */
function queryAssociation(ext: string): Promise<string | undefined> {
  let p = assocCache.get(ext)
  if (!p) {
    const script = [
      `Add-Type -Namespace O -Name A -MemberDefinition '[DllImport("Shlwapi.dll", CharSet = CharSet.Unicode)] public static extern uint AssocQueryString(int f, int s, string a, string e, System.Text.StringBuilder o, ref uint n);'`,
      '$n = [uint32]2048; $b = New-Object System.Text.StringBuilder 2048',
      `if ([O.A]::AssocQueryString(0, 1, '${ext}', 'open', $b, [ref]$n) -eq 0) { $b.ToString() }`
    ].join('; ')
    p = new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', script],
        { windowsHide: true, timeout: 15_000 },
        (err, out) => resolve(err ? undefined : out.trim() || undefined)
      )
    })
    assocCache.set(ext, p)
  }
  return p
}

/** Windows: run the associated app directly instead of Explorer to track play time; unchanged if unreadable */
export async function resolveAssociation(command: Command): Promise<Command> {
  const file = command.openWith
  const ext = file ? extname(file).toLowerCase() : ''
  if (!file || !/^\.[a-z0-9]+$/.test(ext)) return command
  const template = await queryAssociation(ext)
  const parsed = template && parseAssocCommand(template, file)
  // Explorer or a Store app (rundll32, explorer…): nothing to track
  if (!parsed || /(^|\\)(rundll32|explorer|openwith)\.exe$/i.test(parsed.cmd)) return command
  return {
    cmd: parsed.cmd,
    args: parsed.args,
    cwd: command.cwd,
    playtime: 'default-app'
  }
}

export type CommandResult = { ok: true; command: Command } | { ok: false; error: string }

/** The executable the player picked for this game (performance build, launcher), if it still exists */
export function withPickedExe(game: Game, settings: Settings): Game {
  const picked = settings.launchExe[game.id]
  const alt = picked ? game.alternates?.find((a) => a.path === picked) : undefined
  return alt ? { ...game, path: alt.path, dir: dirname(alt.path) } : game
}

export function buildCommand(
  game: Game,
  settings: Settings,
  os: NodeJS.Platform = process.platform,
  protonPrefix = ''
): CommandResult {
  if (game.kind === 'fangame') {
    // RPG Maker reads files relative to the working directory
    if (os === 'win32') return { ok: true, command: { cmd: game.path, args: [], cwd: game.dir } }
    const runner = windowsRunner(game.path, settings, protonPrefix)
    if (!runner) return { ok: false, error: t(`main.runnerMissing.${settings.windowsRunner}`) }
    return { ok: true, command: { ...runner, cwd: game.dir, exeHint: game.path } }
  }

  const platform = game.platform as Exclude<Game['platform'], 'pc'>
  const emu = settings.emulators[platform]
  // No emulator set: the ROM opens with the associated app
  if (!emu?.path) return { ok: true, command: defaultAppCommand(game.path, game.dir, os) }
  // The ROM is the only argument (mGBA, melonDS, DeSmuME, Citra, SameBoy…)
  return {
    ok: true,
    command: { cmd: emu.path, args: [game.path], cwd: game.dir }
  }
}

/** Starts the game detached and reports the session length; returns an error if it can't start */
export function runCommand(
  command: Command,
  onExit: (seconds: number) => void,
  /** Called on every exit, even when play time isn't counted */
  onEnd?: () => void,
  /** Process id of the started game */
  onSpawn?: (pid: number) => void
): Promise<string | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    let settled = false
    const child = spawn(command.cmd, command.args, {
      cwd: command.cwd,
      env: command.env ? { ...process.env, ...command.env } : process.env,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.once('error', (err: NodeJS.ErrnoException) => {
      if (!settled) {
        settled = true
        resolve(
          err.code === 'ENOENT'
            ? t('main.exeNotFound', { cmd: command.cmd })
            : t('main.launchError', { cmd: command.cmd, message: err.message })
        )
      }
    })
    child.once('spawn', () => {
      settled = true
      if (child.pid) onSpawn?.(child.pid)
      resolve(null)
    })
    child.once('exit', () => {
      onEnd?.()
      const seconds = Math.round((Date.now() - started) / 1000)
      if (command.playtime === 'none') return
      // An already-open app took the file and returned at once: count nothing
      if (command.playtime === 'default-app' && seconds < MIN_DEFAULT_APP_SESSION_SEC) return
      onExit(seconds)
    })
    child.unref()
  })
}
