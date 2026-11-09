import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCommand } from '../src/main/launcher'
import { findProtons, windowsRunner } from '../src/main/runners'
import { DEFAULT_SETTINGS, mergeSettings } from '../src/main/store'
import type { Game } from '../src/shared/types'

const s = DEFAULT_SETTINGS
const game = { id: 'z', kind: 'fangame', platform: 'pc', path: '/j/Z/Game.exe', dir: '/j/Z', name: 'Z' } as Game

describe('fangames sous Linux : Wine, Proton, Bottles', () => {
  it('Wine reste le choix par défaut', () => {
    expect(windowsRunner('/j/Game.exe', s, '/p')).toEqual({ cmd: 'wine', args: ['/j/Game.exe'] })
  })

  it('Proton attend la fin du jeu, avec son préfixe', () => {
    const r = windowsRunner(
      '/j/Game.exe',
      { ...s, windowsRunner: 'proton', protonPath: '/steam/Proton 9.0/proton' },
      '/p'
    )
    expect(r?.cmd).toBe('/steam/Proton 9.0/proton')
    expect(r?.args).toEqual(['waitforexitandrun', '/j/Game.exe'])
    expect(r?.env?.['STEAM_COMPAT_DATA_PATH']).toBe('/p')
  })

  it('Bottles, installé normalement ou depuis Flathub', () => {
    const b = { ...s, windowsRunner: 'bottles' as const, bottlesBottle: 'Pokemon' }
    expect(windowsRunner('/j/G.exe', b, '')).toEqual({
      cmd: 'bottles-cli',
      args: ['run', '-b', 'Pokemon', '-e', '/j/G.exe']
    })
    expect(windowsRunner('/j/G.exe', { ...b, bottlesFlatpak: true }, '')?.cmd).toBe('flatpak')
  })

  it('explique ce qui manque quand le lanceur n’est pas réglé', () => {
    const r = buildCommand(game, { ...s, windowsRunner: 'proton', protonPath: '' }, 'linux')
    expect(r.ok).toBe(false)
    const ok = buildCommand(game, s, 'linux')
    expect(ok.ok && ok.command.exeHint).toBe('/j/Z/Game.exe')
  })

  it('trouve les versions de Proton installées', async () => {
    const lib = await mkdtemp(join(tmpdir(), 'offli-proton-'))
    for (const v of ['Proton 9.0', 'GE-Proton9-20', 'Half-Life'])
      await mkdir(join(lib, v), { recursive: true }).then(() => writeFile(join(lib, v, 'proton'), ''))
    await mkdir(join(lib, 'Proton vide'))
    const found = await findProtons([lib, join(lib, 'absent')])
    expect(found.map((p) => p.name)).toEqual(['GE-Proton9-20', 'Proton 9.0'])
  })

  it('un réglage inconnu revient à Wine', () => {
    expect(mergeSettings(s, { windowsRunner: 'crossover' }).windowsRunner).toBe('wine')
    expect(mergeSettings(s, { launchExe: { a: '/x.exe', b: 3 } }).launchExe).toEqual({ a: '/x.exe' })
  })
})
