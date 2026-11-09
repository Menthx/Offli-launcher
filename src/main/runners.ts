import { execFile } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { DetectedRunners, Settings } from '../shared/types'

/** How a Windows game is started outside Windows */
export interface RunnerCommand {
  cmd: string
  args: string[]
  env?: Record<string, string>
}

const BOTTLES_FLATPAK = 'com.usebottles.bottles'

/** Wine, Proton or Bottles command for a Windows .exe; undefined when the runner isn't set up */
export function windowsRunner(exe: string, s: Settings, protonPrefix: string): RunnerCommand | undefined {
  if (s.windowsRunner === 'proton') {
    if (!s.protonPath) return undefined
    return {
      cmd: s.protonPath,
      // waitforexitandrun: Proton waits for the game, so play time is counted
      args: ['waitforexitandrun', exe],
      env: {
        STEAM_COMPAT_DATA_PATH: protonPrefix,
        STEAM_COMPAT_CLIENT_INSTALL_PATH: join(homedir(), '.steam', 'steam')
      }
    }
  }
  if (s.windowsRunner === 'bottles') {
    if (!s.bottlesBottle) return undefined
    const run = ['run', '-b', s.bottlesBottle, '-e', exe]
    return s.bottlesFlatpak
      ? { cmd: 'flatpak', args: ['run', '--command=bottles-cli', BOTTLES_FLATPAK, ...run] }
      : { cmd: 'bottles-cli', args: run }
  }
  return s.winePath ? { cmd: s.winePath, args: [exe] } : undefined
}

const exists = (p: string): Promise<boolean> =>
  access(p).then(
    () => true,
    () => false
  )

/** Exit code 0 */
const succeeds = (cmd: string, args: string[]): Promise<boolean> =>
  new Promise((resolve) => execFile(cmd, args, { timeout: 5000 }, (err) => resolve(!err)))

/** Steam libraries where Proton lives (native and Flatpak Steam) */
export function protonFolders(home = homedir()): string[] {
  const steams = [join(home, '.steam', 'steam'), join(home, '.local', 'share', 'Steam')]
  const flatpak = join(home, '.var', 'app', 'com.valvesoftware.Steam', 'data', 'Steam')
  return [...steams, flatpak].flatMap((s) => [join(s, 'steamapps', 'common'), join(s, 'compatibilitytools.d')])
}

/** Proton versions installed by Steam or by hand (GE-Proton…) */
export async function findProtons(folders = protonFolders()): Promise<{ name: string; path: string }[]> {
  const out: { name: string; path: string }[] = []
  const seen = new Set<string>()
  for (const folder of folders) {
    const names = await readdir(folder).catch(() => [] as string[])
    for (const name of names.filter((n) => /proton/i.test(n)).sort()) {
      const path = join(folder, name, 'proton')
      if (!seen.has(name) && (await exists(path))) {
        seen.add(name)
        out.push({ name, path })
      }
    }
  }
  return out
}

/** What is installed on this Linux machine (nothing to detect elsewhere) */
export async function detectRunners(os: NodeJS.Platform = process.platform): Promise<DetectedRunners> {
  if (os !== 'linux') return { wine: false, protons: [], bottles: false, bottlesFlatpak: false }
  const [wine, protons, native, flatpak] = await Promise.all([
    succeeds('wine', ['--version']),
    findProtons(),
    succeeds('bottles-cli', ['--help']),
    succeeds('flatpak', ['info', BOTTLES_FLATPAK])
  ])
  return { wine, protons, bottles: native || flatpak, bottlesFlatpak: !native && flatpak }
}
