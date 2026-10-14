import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { BASE_ROM_SHA1, type HashCache, identifyBaseRom } from '../src/main/baseRoms'
import { scanLibrary } from '../src/main/scanner'

// Fausse ROM « officielle » : on enregistre son empreinte dans la table le temps du test
const CLEAN = Buffer.from('rom officielle de test')
const CLEAN_SHA1 = createHash('sha1').update(CLEAN).digest('hex')

let root: string

beforeAll(async () => {
  BASE_ROM_SHA1[CLEAN_SHA1] = 'Pokemon - Emerald Version (USA, Europe)'
  root = await mkdtemp(join(tmpdir(), 'offli-base-'))
  await mkdir(join(root, 'rom'), { recursive: true })
  await mkdir(join(root, 'Lazarus'), { recursive: true })
  await writeFile(join(root, 'rom', 'Pokemon - Emerald Version (USA, Europe).gba'), CLEAN)
  await writeFile(join(root, 'Lazarus', 'Pokemon Lazarus v1.0.gba'), 'romhack')
})

afterAll(async () => {
  delete BASE_ROM_SHA1[CLEAN_SHA1]
  await rm(root, { recursive: true, force: true })
})

describe('ROMs de base', () => {
  it('contient les empreintes connues de la bibliothèque de Tonio', () => {
    expect(BASE_ROM_SHA1['f3ae088181bf583e55daf962a92bb46f4f1d07b7']).toBe('Pokemon - Emerald Version (USA, Europe)')
    expect(BASE_ROM_SHA1['677a84289a295926b73172238458ac307e238fd7']).toBe('Pokemon - Version Emeraude (France)')
  })

  it('range une ROM officielle à part, avec son nom No-Intro', async () => {
    const games = await scanLibrary(root)
    expect(games.map((g) => [g.name, g.kind])).toEqual([
      ['Pokemon - Emerald Version (USA, Europe)', 'baserom'],
      ['Pokemon Lazarus v1.0', 'romhack']
    ])
  })

  it('réutilise l’empreinte en cache tant que le fichier ne change pas', async () => {
    const path = join(root, 'Lazarus', 'Pokemon Lazarus v1.0.gba')
    const cache: HashCache = {}
    expect(await identifyBaseRom(path, cache)).toBeUndefined()
    // On falsifie l'empreinte en cache : si elle est réutilisée, la ROM passe pour officielle
    cache[path]!.sha1 = CLEAN_SHA1
    expect(await identifyBaseRom(path, cache)).toBe('Pokemon - Emerald Version (USA, Europe)')
    // Fichier modifié : l'empreinte est recalculée
    await writeFile(path, 'romhack modifié')
    expect(await identifyBaseRom(path, cache)).toBeUndefined()
  })
})
