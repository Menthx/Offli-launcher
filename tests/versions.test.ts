import { describe, expect, it } from 'vitest'
import { groupVersions, parseVersion } from '../src/main/scanner'
import type { Game } from '../src/shared/types'

const fangame = (dir: string, name = 'PokeFallen'): Game => ({
  id: dir,
  name,
  kind: 'fangame',
  platform: 'pc',
  path: `D:/Pokemon/beta/${dir}/Fallen.exe`,
  dir: `D:/Pokemon/beta/${dir}`
})

describe('parseVersion', () => {
  it('lit la version française entre parenthèses', () => {
    expect(parseVersion('Pokemon Cuerpo de Cristal v1.3.3 (Fr 1.0.7)')).toEqual([1, 0, 7])
    expect(parseVersion('PokeFallen (Fr 1.0.4) - TOUR DE COMBAT')).toEqual([1, 0, 4])
  })

  it('prend sinon le dernier numéro de version', () => {
    expect(parseVersion('Pokemon Odyssey COMPLETE v4.0.3')).toEqual([4, 0, 3])
    expect(parseVersion('Regis')).toEqual([])
  })
})

describe('groupVersions', () => {
  const games = [
    fangame('PokeFallen (Fr 1.0.4)'),
    fangame('PokeFallen (Fr 1.1.3)'),
    fangame('PokeFallen (Fr 1.0.4) - TOUR DE COMBAT'),
    fangame('PokeFallen (Fr 1.1.0)'),
    fangame('Pokemon Z', 'Pokemon Z')
  ]

  it('garde une seule carte par fangame, la version la plus récente', () => {
    const out = groupVersions(games)
    expect(out.map((g) => g.id)).toEqual(['PokeFallen (Fr 1.1.3)', 'Pokemon Z'])
  })

  it('range les autres versions de la plus récente à la plus ancienne', () => {
    const fallen = groupVersions(games).find((g) => g.name === 'PokeFallen')!
    expect(fallen.versions?.map((v) => v.variant)).toEqual([
      'PokeFallen (Fr 1.1.3)',
      'PokeFallen (Fr 1.1.0)',
      'PokeFallen (Fr 1.0.4)',
      'PokeFallen (Fr 1.0.4) - TOUR DE COMBAT'
    ])
  })

  it('laisse intact un fangame sans autre version', () => {
    const z = groupVersions(games).find((g) => g.name === 'Pokemon Z')!
    expect(z.versions).toBeUndefined()
  })
})
