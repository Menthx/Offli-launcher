import { execFile, spawn } from 'node:child_process'
import { extname } from 'node:path'
import type { Game, Settings } from '../shared/types'

export interface Command {
  cmd: string
  args: string[]
  cwd: string
  /** Windows : à remplacer par l'application associée au fichier (voir resolveAssociation) */
  openWith?: string
  /**
   * Suivi du temps de jeu : 'exit' = durée du process, 'none' = pas de suivi,
   * 'default-app' = application par défaut du système, compté seulement si l'attente a marché
   */
  playtime?: 'exit' | 'none' | 'default-app'
}

/** En dessous, une ouverture par l'application par défaut a rendu la main sans attendre le jeu */
export const MIN_DEFAULT_APP_SESSION_SEC = 15

/**
 * Ouvre un fichier avec l'application associée par le système :
 * - Windows : l'exécutable associé, lancé directement (voir resolveAssociation) ; à défaut
 *   l'Explorateur, qui rend la main tout de suite (pas de temps de jeu) ;
 * - macOS : « open -W », qui attend la fermeture ;
 * - Linux : « xdg-open », qui rend la main tout de suite (pas de temps de jeu).
 */
export function defaultAppCommand(path: string, cwd: string, os: NodeJS.Platform): Command {
  if (os === 'win32') return { cmd: 'explorer.exe', args: [path], cwd, playtime: 'none', openWith: path }
  if (os === 'darwin') return { cmd: 'open', args: ['-W', path], cwd, playtime: 'default-app' }
  return { cmd: 'xdg-open', args: [path], cwd, playtime: 'none' }
}

/**
 * Découpe une commande d'association Windows ('"C:\…\mGBA.exe" "%1"') et y place le fichier.
 * %1 et %L sont remplacés par le chemin, les autres variables (%*, %I…) sont retirées.
 */
export function parseAssocCommand(template: string, file: string): { cmd: string; args: string[] } | undefined {
  const tokens = [...template.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2])
  const [cmd, ...rest] = tokens
  if (!cmd) return undefined
  const args = rest
    .map((a) => a.replace(/%[1L]/gi, file))
    .filter((a) => !/%[*\w]/.test(a) || a.includes(file))
  if (!rest.some((a) => /%[1L]/i.test(a))) args.push(file)
  return { cmd, args }
}

const assocCache = new Map<string, Promise<string | undefined>>()

/** Commande d'ouverture associée à une extension (AssocQueryString), mise en cache */
function queryAssociation(ext: string): Promise<string | undefined> {
  let p = assocCache.get(ext)
  if (!p) {
    const script = [
      `Add-Type -Namespace O -Name A -MemberDefinition '[DllImport("Shlwapi.dll", CharSet = CharSet.Unicode)] public static extern uint AssocQueryString(int f, int s, string a, string e, System.Text.StringBuilder o, ref uint n);'`,
      '$n = [uint32]2048; $b = New-Object System.Text.StringBuilder 2048',
      `if ([O.A]::AssocQueryString(0, 1, '${ext}', 'open', $b, [ref]$n) -eq 0) { $b.ToString() }`
    ].join('; ')
    p = new Promise((resolve) => {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15_000 }, (err, out) =>
        resolve(err ? undefined : out.trim() || undefined)
      )
    })
    assocCache.set(ext, p)
  }
  return p
}

/**
 * Windows : remplace l'ouverture par l'Explorateur par l'application associée, lancée
 * directement, pour suivre le temps de jeu. Sans association lisible, la commande reste inchangée.
 */
export async function resolveAssociation(command: Command): Promise<Command> {
  const file = command.openWith
  const ext = file ? extname(file).toLowerCase() : ''
  if (!file || !/^\.[a-z0-9]+$/.test(ext)) return command
  const template = await queryAssociation(ext)
  const parsed = template && parseAssocCommand(template, file)
  // Ouverture par l'Explorateur ou une appli du Store (rundll32, explorer…) : pas de process à suivre
  if (!parsed || /(^|\\)(rundll32|explorer|openwith)\.exe$/i.test(parsed.cmd)) return command
  return { cmd: parsed.cmd, args: parsed.args, cwd: command.cwd, playtime: 'default-app' }
}

export type CommandResult = { ok: true; command: Command } | { ok: false; error: string }

export function buildCommand(game: Game, settings: Settings, os: NodeJS.Platform = process.platform): CommandResult {
  if (game.kind === 'fangame') {
    // RPG Maker lit ses fichiers relativement au dossier courant
    if (os === 'win32') return { ok: true, command: { cmd: game.path, args: [], cwd: game.dir } }
    if (!settings.winePath) return { ok: false, error: 'Indique la commande Wine dans les paramètres pour lancer les fangames.' }
    return { ok: true, command: { cmd: settings.winePath, args: [game.path], cwd: game.dir } }
  }

  const platform = game.platform as Exclude<Game['platform'], 'pc'>
  const emu = settings.emulators[platform]
  // Sans émulateur configuré, la ROM s'ouvre avec l'application associée (mGBA, melonDS…)
  if (!emu?.path) return { ok: true, command: defaultAppCommand(game.path, game.dir, os) }
  // La ROM est le seul argument : c'est ce qu'attendent mGBA, melonDS, DeSmuME, Citra, SameBoy…
  return { ok: true, command: { cmd: emu.path, args: [game.path], cwd: game.dir } }
}

/**
 * Lance le jeu détaché et appelle `onExit` avec la durée de la session.
 * Renvoie une erreur si le process ne démarre pas.
 */
export function runCommand(command: Command, onExit: (seconds: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    let settled = false
    const child = spawn(command.cmd, command.args, {
      cwd: command.cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.once('error', (err: NodeJS.ErrnoException) => {
      if (!settled) {
        settled = true
        resolve(
          err.code === 'ENOENT'
            ? `${command.cmd} est introuvable. Vérifie le chemin dans les paramètres.`
            : `Impossible de lancer ${command.cmd} : ${err.message}`
        )
      }
    })
    child.once('spawn', () => {
      settled = true
      resolve(null)
    })
    child.once('exit', () => {
      const seconds = Math.round((Date.now() - started) / 1000)
      if (command.playtime === 'none') return
      // Application déjà ouverte qui reprend le fichier et rend la main aussitôt : on ne compte rien
      if (command.playtime === 'default-app' && seconds < MIN_DEFAULT_APP_SESSION_SEC) return
      onExit(seconds)
    })
    child.unref()
  })
}
