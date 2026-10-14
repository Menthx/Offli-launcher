import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseRgssIni, pickFangameExe, scanLibrary } from '../src/main/scanner'
import type { Game } from '../src/shared/types'

const INI = (title: string): string => `[Game]\r\nLibrary=RGSS104E.dll\r\nScripts=Data\\Scripts.rxdata\r\nTitle=${title}\r\n`

let root: string
let games: Game[]

async function file(path: string, content: string | Buffer = ''): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true })
  await writeFile(join(root, path), content)
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'offli-fan-'))
  // Exécutable nommé comme son .ini (Fallen.ini → Fallen.exe), avec un Game.ini en plus
  await file('beta/PokeFallen (Fr 1.1.3)/Fallen.exe')
  await file('beta/PokeFallen (Fr 1.1.3)/Fallen.ini', INI('PokeFallen'))
  await file('beta/PokeFallen (Fr 1.1.3)/Game.ini', INI('PokeFallen'))
  // Pas de Game.exe : le seul .exe qui n'est pas un outil
  await file('InfiniteFusion2/Game.ini', INI('Infinite Fusion'))
  await file('InfiniteFusion2/InfiniteFusion2.exe')
  await file('InfiniteFusion2/InfiniteFusion2-performance.exe')
  // Jeu installé par un launcher : nommé d'après le dossier parent
  await file('Regis/Launcher.exe')
  await file('Regis/app/app_data.json', JSON.stringify({ start_exe_path: 'Game.exe' }))
  await file('Regis/app/Game.exe')
  await file('Regis/app/ruby.exe')
  await file('Regis/patcher/PatchKit Default Patcher.exe')
  // Data/ et une RGSS*.dll, sans .ini
  await file('Sans ini/Game.exe')
  await file('Sans ini/RGSS102E.dll')
  await mkdir(join(root, 'Sans ini/Data'), { recursive: true })
  // Outils et launchers seuls : ignorés
  await file('PKHeX.exe')
  await file('Renaissance launcher/launcher.exe')
  await file('Renaissance launcher/uninstall.exe')
  await file('Outils/MapMaker.ini', '[MapMaker]\r\nPath=.\r\n')
  await file('Outils/MapMaker.exe')
  games = await scanLibrary(root)
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

const find = (name: string): Game | undefined => games.find((g) => g.name === name)

describe('détection des fangames', () => {
  it('trouve exactement les jeux, sans les outils ni les launchers', () => {
    expect(games.map((g) => g.name)).toEqual(['Infinite Fusion', 'PokeFallen', 'Regis', 'Sans ini'])
    expect(games.every((g) => g.kind === 'fangame')).toBe(true)
  })

  it("lance l'exécutable nommé comme le .ini", () => {
    expect(find('PokeFallen')?.path).toMatch(/Fallen\.exe$/)
  })

  it('prend le seul exécutable restant hors outils', () => {
    expect(find('Infinite Fusion')?.path).toMatch(/InfiniteFusion2\.exe$/)
  })

  it("nomme un jeu de launcher d'après le dossier parent et lance app/Game.exe", () => {
    const regis = find('Regis')!
    expect(regis.path).toBe(join(root, 'Regis', 'app', 'Game.exe'))
    expect(regis.dir).toBe(join(root, 'Regis', 'app'))
  })
})

describe('parseRgssIni', () => {
  it('lit le titre d’un .ini RPG Maker', () => {
    expect(parseRgssIni('Game.ini', INI('Pokemon Z'))).toEqual({ file: 'Game.ini', title: 'Pokemon Z' })
  })

  it('refuse un .ini sans Library=RGSS', () => {
    expect(parseRgssIni('MapMaker.ini', '[Game]\r\nTitle=X\r\n')).toBeUndefined()
  })
})

describe('pickFangameExe', () => {
  it('préfère Game.exe à un autre exécutable', () => {
    expect(pickFangameExe(['Launcher.exe', 'Game.exe', 'Editor.exe'], [])).toBe('Game.exe')
  })

  it('renonce si plusieurs exécutables restent possibles', () => {
    expect(pickFangameExe(['A.exe', 'B.exe'], [])).toBeUndefined()
  })
})
