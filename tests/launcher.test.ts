import { describe, expect, it } from 'vitest'
import { buildCommand } from '../src/main/launcher'
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

  it("demande un émulateur s'il n'est pas configuré", () => {
    const r = buildCommand(rom, settings(), 'win32')
    expect(r).toEqual({ ok: false, error: 'Choisis un émulateur Game Boy Advance dans les paramètres.' })
  })

  it('remplace {rom} dans les arguments', () => {
    const s = settings()
    s.emulators.gba = { path: 'C:/mGBA/mGBA.exe', args: ['-f', '{rom}'] }
    const r = buildCommand(rom, s, 'win32')
    expect(r.ok && r.command.args).toEqual(['-f', '/g/Unbound.gba'])
  })
})
