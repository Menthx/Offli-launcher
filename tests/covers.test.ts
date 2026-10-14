import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CoverResolver } from '../src/main/covers'
import { DEFAULT_SETTINGS } from '../src/main/store'
import type { Game } from '../src/shared/types'

let root: string
let covers: CoverResolver

async function file(path: string, size = 10): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true })
  await writeFile(join(root, path), Buffer.alloc(size))
}

const fangame = (dir: string): Game => ({ id: dir, name: dir, kind: 'fangame', platform: 'pc', path: join(root, dir, 'Game.exe'), dir: join(root, dir) })
const rom = (dir: string, file: string): Game => ({ id: dir, name: dir, kind: 'romhack', platform: 'gba', path: join(root, dir, file), dir: join(root, dir) })
const pick = async (game: Game): Promise<string | null> => {
  const path = await covers.resolve(game)
  return path && basename(path)
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'offli-covers-'))
  // Hors cache : rien n'est téléchargé (pas de SteamGridDB, pas de jaquette du jeu de base)
  covers = new CoverResolver(join(root, '.cache'), () => ({ ...DEFAULT_SETTINGS, useBaseRomCovers: false }))
  await file('Fusion/Graphics/Titles/credits1.png', 9000)
  await file('Fusion/Graphics/Titles/splash.png', 8000)
  await file('Fusion/Graphics/Titles/bg_clouds.png', 7000)
  await file('Fusion/Graphics/Titles/gen1_bg.png', 9500)
  await file('Fusion/Graphics/Titles/gen_6_overlay.png', 9400)
  await file('Fusion/Graphics/Titles/intro1.png', 9300)
  await file('Fusion/Graphics/Titles/InfiniteFusionHoenn.png', 5000)
  await file('Fusion/Graphics/Titles/pokelogo.png', 100)
  await file('Fallen/Graphics/Titles/title.png', 10)
  await file('Fallen/Graphics/Titles/start.png', 9000)
  await file('Fallen/Icon.png')
  await file('Regis/Icon.png')
  await file('Renaissance/project_icon.png')
  await file('Odyssey/Odyssey (patched).gba')
  await file('Odyssey/Odyssey (patched)-0.png')
  await file('Hunter/Hunter.gba')
  await file('Hunter/Hunter-0.png')
  await file('Hunter/cover.png')
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('images des fangames', () => {
  it('prend title.png en priorité', async () => {
    expect(await pick(fangame('Fallen'))).toBe('title.png')
  })

  it('prend sinon la plus grande image hors crédits, splash, intro, fonds et calques', async () => {
    expect(await pick(fangame('Fusion'))).toBe('InfiniteFusionHoenn.png')
  })

  it("se rabat sur l'icône du jeu", async () => {
    expect(await pick(fangame('Regis'))).toBe('Icon.png')
    expect(await pick(fangame('Renaissance'))).toBe('project_icon.png')
  })
})

describe('images des romhacks', () => {
  it("utilise la capture d'écran de mGBA", async () => {
    expect(await pick(rom('Odyssey', 'Odyssey (patched).gba'))).toBe('Odyssey (patched)-0.png')
  })

  it('préfère cover.png à la capture', async () => {
    expect(await pick(rom('Hunter', 'Hunter.gba'))).toBe('cover.png')
  })
})
