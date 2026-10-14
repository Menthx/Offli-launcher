import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { gameId, scanLibrary } from '../src/main/scanner'

let a: string
let b: string

beforeAll(async () => {
  a = await mkdtemp(join(tmpdir(), 'offli-a-'))
  b = await mkdtemp(join(tmpdir(), 'offli-b-'))
  for (const [root, name] of [
    [a, 'Lazarus'],
    [b, 'Lazarus'],
    [b, 'Unbound']
  ]) {
    await mkdir(join(root, name), { recursive: true })
    await writeFile(join(root, name, `${name}.gba`), name)
  }
})

afterAll(async () => {
  await rm(a, { recursive: true, force: true })
  await rm(b, { recursive: true, force: true })
})

describe('plusieurs dossiers', () => {
  it('fusionne les jeux de tous les dossiers', async () => {
    const games = await scanLibrary([a, b])
    expect(games.map((g) => g.name)).toEqual(['Lazarus', 'Lazarus', 'Unbound'])
    expect(new Set(games.map((g) => g.id)).size).toBe(3)
  })

  it('garde les ids du premier dossier pour ne pas perdre stats et réglages', async () => {
    const games = await scanLibrary([a, b])
    const first = games.find((g) => g.path.startsWith(a))!
    expect(first.id).toBe(gameId(a, join(a, 'Lazarus', 'Lazarus.gba')))
  })

  it('ignore les entrées vides', async () => {
    expect(await scanLibrary(['', a])).toHaveLength(1)
    expect(await scanLibrary([])).toEqual([])
  })
})
