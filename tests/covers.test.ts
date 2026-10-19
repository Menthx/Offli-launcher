import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CoverResolver } from '../src/main/covers'
import { DEFAULT_SETTINGS } from '../src/main/store'
import type { Game } from '../src/shared/types'
import { dib32, fakeExe } from './helpers/fakeExe'
import type { ImageStats } from '../src/main/cover/titles'

let root: string
let covers: CoverResolver

async function file(path: string, size = 10): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true })
  await writeFile(join(root, path), Buffer.alloc(size))
}

// Test images hold their own measurements as JSON
const FULL: ImageStats = { width: 512, height: 384, coverage: 1, colors: 200 }
async function image(path: string, stats: Partial<ImageStats> = {}): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true })
  await writeFile(join(root, path), JSON.stringify({ ...FULL, ...stats }))
}
const readStats = async (path: string): Promise<ImageStats | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as ImageStats
  } catch {
    return null
  }
}

const fangame = (dir: string): Game => ({
  id: dir,
  name: dir,
  kind: 'fangame',
  platform: 'pc',
  path: join(root, dir, 'Game.exe'),
  dir: join(root, dir)
})
const rom = (dir: string, file: string): Game => ({
  id: dir,
  name: dir,
  kind: 'romhack',
  platform: 'gba',
  path: join(root, dir, file),
  dir: join(root, dir)
})
const pick = async (game: Game): Promise<string | null> => {
  const path = await covers.resolve(game)
  return path && basename(path)
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'offli-covers-'))
  // Cache-free: nothing is downloaded (no SteamGridDB, no base game cover)
  covers = new CoverResolver(
    join(root, '.cache'),
    () => ({ ...DEFAULT_SETTINGS, useBaseRomCovers: false }),
    undefined,
    readStats
  )
  await image('Fusion/Graphics/Titles/credits1.png')
  await image('Fusion/Graphics/Titles/gen1_bg.png')
  await image('Fusion/Graphics/Titles/InfiniteFusionHoenn.png')
  await image('Fusion/Graphics/Titles/PokemonInfiniteFusionLogo_Back_25.png')
  await image('Fusion/Graphics/Titles/gen1_bg_logo.png', { colors: 120 })
  await image('Fusion/Graphics/Titles/pokelogo.png', { coverage: 0.3 })
  await image('Fallen/Graphics/Titles/title.png')
  await image('Fallen/Graphics/Titles/start.png')
  await image('Fallen/Graphics/Titles/splash_title.png', { colors: 250 })
  await file('Fallen/Icon.png')
  await image('Revival/Graphics/Titles/title.png')
  await image('Revival/Graphics/Titles/logo1.png', { coverage: 0.35 })
  await image('Revival/Graphics/Titles/logo3.png', { coverage: 0.05 })
  await image('Revival/Graphics/Titles/logo2.png', { width: 200, height: 35 })
  await image('Decay/Graphics/Titles/titlebild.png')
  await image('Decay/Graphics/Titles/4-3 Title Picture.png', { width: 708, height: 944 })
  await image('Shadow/Graphics/Titles/custom_pokelogo.png', { coverage: 0.4, colors: 2 })
  await file('Shadow/Icon.png')
  await file('Studio/graphics/icons/game.png')
  await file('Regis/Icon.png')
  await file('Renaissance/project_icon.png')
  await file('Odyssey/Odyssey (patched).gba')
  await file('Odyssey/Odyssey (patched)-0.png')
  await file('Odyssey/Odyssey (patched).png')
  await file('Hunter/Hunter.gba')
  await file('Hunter/Hunter-0.png')
  await file('Hunter/cover.png')
  await mkdir(join(root, 'Uranium'), { recursive: true })
  await writeFile(join(root, 'Uranium/Game.exe'), fakeExe(dib32(64), 64))
  await file('Uranium/Icon.png')
  await image('Titled/Graphics/Titles/title.png')
  await writeFile(join(root, 'Titled/Game.exe'), fakeExe(dib32(64), 64))
  await file('Tiny/Icon.png')
  await writeFile(join(root, 'Tiny/Game.exe'), fakeExe(dib32(32), 32))
  await mkdir(join(root, 'TinyOnly'), { recursive: true })
  await writeFile(join(root, 'TinyOnly/Game.exe'), fakeExe(dib32(32), 32))
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('images des fangames', () => {
  it("prend l'écran titre, pas les crédits, splash ou invites", async () => {
    expect(await pick(fangame('Fallen'))).toBe('title.png')
  })

  it("préfère un logo à l'écran titre, même posé sur un fond", async () => {
    expect(await pick(fangame('Fusion'))).toBe('gen1_bg_logo.png')
    expect(await pick(fangame('Revival'))).toBe('logo1.png')
  })

  it('préfère une image en portrait à détail égal', async () => {
    expect(await pick(fangame('Decay'))).toBe('4-3 Title Picture.png')
  })

  it('écarte les contours et silhouettes, puis prend Icon.png', async () => {
    expect(await pick(fangame('Shadow'))).toBe('Icon.png')
  })

  it("se rabat sur l'icône du jeu", async () => {
    expect(await pick(fangame('Regis'))).toBe('Icon.png')
    expect(await pick(fangame('Renaissance'))).toBe('project_icon.png')
    expect(await pick(fangame('Studio'))).toBe('game.png')
  })
})

describe('icône du .exe des fangames', () => {
  it('passe après le logo ou l’écran titre', async () => {
    expect(await pick(fangame('Titled'))).toBe('title.png')
  })

  it('passe avant Icon.png', async () => {
    expect(await pick(fangame('Uranium'))).toBe('Uranium-exeicon.png')
  })

  it('laisse Icon.png à une icône de moins de 48 px', async () => {
    expect(await pick(fangame('Tiny'))).toBe('Icon.png')
  })

  it("reste l'image de secours sans autre image", async () => {
    expect(await pick(fangame('TinyOnly'))).toBe('TinyOnly-exeicon.png')
  })
})

describe('images des romhacks', () => {
  it("n'utilise jamais les captures d'émulateur (<rom>.png, <rom>-0.png)", async () => {
    expect(await pick(rom('Odyssey', 'Odyssey (patched).gba'))).toBeNull()
  })

  it('utilise un cover.png posé dans le dossier', async () => {
    expect(await pick(rom('Hunter', 'Hunter.gba'))).toBe('cover.png')
  })
})
