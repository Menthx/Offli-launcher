import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { gameId, scanLibrary } from '../src/main/scanner'

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'offli-'))
  await mkdir(join(root, 'Fangames', 'Reborn', 'Data'), { recursive: true })
  await writeFile(join(root, 'Fangames', 'Reborn', 'Game.exe'), '')
  await writeFile(join(root, 'Fangames', 'Reborn', 'Game.ini'), '[Game]\r\nLibrary=RGSS104E.dll\r\nTitle=Pokemon Reborn\r\n')
  // un .gba dans le dossier d'un fangame ne doit pas être compté
  await writeFile(join(root, 'Fangames', 'Reborn', 'Data', 'junk.gba'), '')
  await mkdir(join(root, 'Fangames', 'Uranium'), { recursive: true })
  await writeFile(join(root, 'Fangames', 'Uranium', 'game.EXE'), '')

  await mkdir(join(root, 'Romhacks', 'GBA'), { recursive: true })
  const gba = Buffer.alloc(0x200)
  gba.write('BPRE', 0xac, 'ascii')
  await writeFile(join(root, 'Romhacks', 'GBA', 'Radical Red.gba'), gba)
  await writeFile(join(root, 'Romhacks', 'notes.txt'), 'hello')
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('scanLibrary', () => {
  it('trouve les fangames et les romhacks', async () => {
    const games = await scanLibrary(root)
    expect(games.map((g) => g.name)).toEqual(['Pokemon Reborn', 'Radical Red', 'Uranium'])
  })

  it('identifie la base des romhacks', async () => {
    const rr = (await scanLibrary(root)).find((g) => g.name === 'Radical Red')!
    expect(rr.kind).toBe('romhack')
    expect(rr.platform).toBe('gba')
    expect(rr.baseRom).toEqual({ code: 'BPRE', name: 'Rouge Feu' })
  })

  it('donne un identifiant stable quel que soit le séparateur', () => {
    expect(gameId('/lib', '/lib/A/Game.exe')).toBe(gameId('/lib', '/lib/a/game.exe'))
  })

  it('renvoie une liste vide sans dossier', async () => {
    expect(await scanLibrary('')).toEqual([])
  })
})
