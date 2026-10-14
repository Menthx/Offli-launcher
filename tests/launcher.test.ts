import { describe, expect, it } from 'vitest'
import { type Command, buildCommand, parseAssocCommand, runCommand } from '../src/main/launcher'
import { DEFAULT_SETTINGS } from '../src/main/store'
import type { Game, Settings } from '../src/shared/types'

const fangame: Game = { id: 'a', name: 'Reborn', kind: 'fangame', platform: 'pc', path: '/g/Reborn/Game.exe', dir: '/g/Reborn' }
const rom: Game = { id: 'b', name: 'Unbound', kind: 'romhack', platform: 'gba', path: '/g/Unbound.gba', dir: '/g' }

function settings(patch: Partial<Settings> = {}): Settings {
  return { ...structuredClone(DEFAULT_SETTINGS), ...patch }
}

describe('buildCommand', () => {
  it('lance Game.exe directement sous Windows, depuis son dossier', () => {
    const r = buildCommand(fangame, settings(), 'win32')
    expect(r).toEqual({ ok: true, command: { cmd: fangame.path, args: [], cwd: '/g/Reborn' } })
  })

  it('passe par Wine sous Linux et macOS', () => {
    for (const os of ['linux', 'darwin'] as const) {
      const r = buildCommand(fangame, settings(), os)
      expect(r.ok && r.command.cmd).toBe('wine')
    }
  })

  it("passe par l'application associée sous Windows sans émulateur configuré", () => {
    const r = buildCommand(rom, settings(), 'win32')
    expect(r.ok && r.command).toEqual({ cmd: 'explorer.exe', args: ['/g/Unbound.gba'], cwd: '/g', playtime: 'none', openWith: '/g/Unbound.gba' })
  })

  it("attend l'application par défaut sous macOS, pas sous Linux", () => {
    const mac = buildCommand(rom, settings(), 'darwin')
    expect(mac.ok && [mac.command.cmd, mac.command.args, mac.command.playtime]).toEqual(['open', ['-W', '/g/Unbound.gba'], 'default-app'])
    const linux = buildCommand(rom, settings(), 'linux')
    expect(linux.ok && [linux.command.cmd, linux.command.playtime]).toEqual(['xdg-open', 'none'])
  })

  it('remplace {rom} dans les arguments', () => {
    const s = settings()
    s.emulators.gba = { path: 'C:/mGBA/mGBA.exe', args: ['-f', '{rom}'] }
    const r = buildCommand(rom, s, 'win32')
    expect(r.ok && r.command.args).toEqual(['-f', '/g/Unbound.gba'])
  })
})

describe('runCommand', () => {
  const node = (playtime: Command['playtime']): Command => ({ cmd: process.execPath, args: ['-e', ''], cwd: '.', playtime })
  const run = (c: Command): Promise<number | null> =>
    new Promise((resolve) => {
      void runCommand(c, resolve)
      setTimeout(() => resolve(null), 1500)
    })

  it('compte la durée du process par défaut', async () => {
    expect(await run(node('exit'))).toBe(0)
  })

  it("ne compte pas une application par défaut qui rend la main aussitôt", async () => {
    expect(await run(node('default-app'))).toBeNull()
    expect(await run(node('none'))).toBeNull()
  })
})

describe('parseAssocCommand', () => {
  const rom = 'D:/Jeux/Pokémon & co/Unbound (v2).gba'

  it('remplace %1 par la ROM', () => {
    expect(parseAssocCommand('"C:\Program Files\mGBA\mGBA.exe" "%1"', rom)).toEqual({ cmd: 'C:\Program Files\mGBA\mGBA.exe', args: [rom] })
  })

  it('retire les autres variables et ajoute la ROM si %1 manque', () => {
    expect(parseAssocCommand('C:\melonDS.exe %*', rom)).toEqual({ cmd: 'C:\melonDS.exe', args: [rom] })
    expect(parseAssocCommand('"C:\emu.exe" -f "%L"', rom)).toEqual({ cmd: 'C:\emu.exe', args: ['-f', rom] })
  })
})
