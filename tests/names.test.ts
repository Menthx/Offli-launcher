import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isBaseLikeRomName, isPlaceholderTitle, scanLibrary } from '../src/main/scanner'
import type { Game } from '../src/shared/types'

let root: string
let games: Game[]

async function file(path: string, content: string | Buffer = ''): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true })
  await writeFile(join(root, path), content)
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'offli-names-'))
  // Projet Pokémon SDK : project.studio passe avant Title=Untitled
  await file('gamerenaissance/Game.exe')
  await file('gamerenaissance/Game.ini', '[Game]\r\nLibrary=RGSS104E.dll\r\nTitle=Untitled\r\n')
  await file('gamerenaissance/project.studio', JSON.stringify({ title: 'Projet Renaissance', iconPath: 'project_icon.png' }))
  // Titre technique : nom du dossier
  await file('InfiniteFusion2/InfiniteFusion2.exe')
  await file('InfiniteFusion2/Game.ini', '[Game]\r\nLibrary=RGSS104E.dll\r\nTitle=infinitefusion-hoenn\r\n')
  // .ini en Latin-1
  await file('Plastic/Game.exe')
  await file('Plastic/Game.ini', Buffer.from('[Game]\r\nLibrary=RGSS104E.dll\r\nTitle=Pokémon Plastic Pyrite\r\n', 'latin1'))
  // ROMs patchées qui gardent le nom du jeu de base
  await file('Pokemon Odyssey COMPLETE v4.0.3/Pokemon - FireRed Version (USA, Europe) (patched).gba')
  await file('Pokemon X Monster hunter/Pokemon - Emerald Version (USA, Europe) (patched).gba')
  await file('Lazarus/Pokemon Lazarus v1.0.gba')
  games = await scanLibrary(root)
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('noms des jeux', () => {
  it('nomme chaque jeu correctement', () => {
    expect(games.map((g) => g.name)).toEqual([
      'InfiniteFusion2',
      'Pokemon Lazarus v1.0',
      'Pokemon Odyssey COMPLETE v4.0.3',
      'Pokémon Plastic Pyrite',
      'Pokemon X Monster hunter',
      'Projet Renaissance'
    ])
  })
})

describe('isPlaceholderTitle', () => {
  it.each(['', 'Untitled', 'infinitefusion-hoenn', 'my_game'])('« %s » est un titre de remplacement', (t) => {
    expect(isPlaceholderTitle(t)).toBe(true)
  })

  it.each(['PokeFallen', 'Pokemon Z', 'Pokémon Decay'])('« %s » est un vrai titre', (t) => {
    expect(isPlaceholderTitle(t)).toBe(false)
  })
})

describe('isBaseLikeRomName', () => {
  it('reconnaît les noms de jeux de base', () => {
    expect(isBaseLikeRomName('Pokemon - Emerald Version (USA, Europe) (patched)')).toBe(true)
    expect(isBaseLikeRomName('Pokemon - FireRed Version (USA, Europe)')).toBe(true)
    expect(isBaseLikeRomName('Pokemon - Version Emeraude (F)')).toBe(true)
  })

  it('garde les noms de romhacks', () => {
    expect(isBaseLikeRomName('Pokemon Lazarus v1.0')).toBe(false)
    expect(isBaseLikeRomName('Pokémon Odyssey FR 1.0')).toBe(false)
  })
})
