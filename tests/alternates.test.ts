import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { withPickedExe } from '../src/main/launcher'
import { findAlternates } from '../src/main/scan/fangame'
import { scanLibrary } from '../src/main/scanner'
import { DEFAULT_SETTINGS } from '../src/main/store'
import type { Game } from '../src/shared/types'

describe('autres exécutables d’un fangame', () => {
  it('propose la version performance et le launcher', () => {
    const alts = findAlternates(
      '/j/IF',
      ['InfiniteFusion2.exe', 'InfiniteFusion2-performance.exe'],
      'InfiniteFusion2.exe'
    )
    expect(alts).toEqual([{ path: join('/j/IF', 'InfiniteFusion2-performance.exe'), kind: 'performance' }])
    const regis = findAlternates('/j/Regis/app', ['Game.exe'], 'Game.exe', ['Launcher.exe', 'Launcher-english.exe'])
    expect(regis).toEqual([{ path: join('/j/Regis', 'Launcher.exe'), kind: 'launcher' }])
  })

  it('le scan les trouve, y compris le launcher du dossier parent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'offli-alt-'))
    await mkdir(join(root, 'Regis', 'app'), { recursive: true })
    await writeFile(join(root, 'Regis', 'Launcher.exe'), '')
    await writeFile(join(root, 'Regis', 'app', 'Game.exe'), '')
    await writeFile(join(root, 'Regis', 'app', 'app_data.json'), '{"start_exe_path":"Game.exe"}')
    const [regis] = await scanLibrary(root)
    expect(regis!.name).toBe('Regis')
    expect(regis!.alternates).toEqual([{ path: join(root, 'Regis', 'Launcher.exe'), kind: 'launcher' }])
  })

  it('lance l’exécutable choisi, s’il fait toujours partie du jeu', () => {
    const game = {
      id: 'if',
      path: '/j/IF/InfiniteFusion2.exe',
      dir: '/j/IF',
      alternates: [{ path: '/j/IF/InfiniteFusion2-performance.exe', kind: 'performance' }]
    } as Game
    const pick = (path: string) => withPickedExe(game, { ...DEFAULT_SETTINGS, launchExe: { if: path } }).path
    expect(pick('/j/IF/InfiniteFusion2-performance.exe')).toBe('/j/IF/InfiniteFusion2-performance.exe')
    expect(pick('/ailleurs/virus.exe')).toBe('/j/IF/InfiniteFusion2.exe')
  })
})
