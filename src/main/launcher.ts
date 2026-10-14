import { spawn } from 'node:child_process'
import type { Game, Settings } from '../shared/types'

const PLATFORM_LABEL: Record<string, string> = {
  gb: 'Game Boy',
  gbc: 'Game Boy Color',
  gba: 'Game Boy Advance',
  nds: 'Nintendo DS',
  '3ds': 'Nintendo 3DS'
}

export interface Command {
  cmd: string
  args: string[]
  cwd: string
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
  if (!emu?.path) {
    return { ok: false, error: `Choisis un émulateur ${PLATFORM_LABEL[platform]} dans les paramètres.` }
  }
  const args = emu.args.length ? emu.args : ['{rom}']
  return {
    ok: true,
    command: { cmd: emu.path, args: args.map((a) => a.replaceAll('{rom}', game.path)), cwd: game.dir }
  }
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
    child.once('exit', () => onExit(Math.round((Date.now() - started) / 1000)))
    child.unref()
  })
}
