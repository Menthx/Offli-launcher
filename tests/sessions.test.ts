import { describe, expect, it } from 'vitest'
import { type Session, SessionTracker, exeName, isGameProcess } from '../src/main/sessions'

const setup = () => {
  let now = 1_000_000
  const credited: Record<string, number> = {}
  const store = { data: {} as Record<string, Session>, saves: 0, save: async () => void store.saves++ }
  const tracker = new SessionTracker(
    store,
    (id, s) => (credited[id] = (credited[id] ?? 0) + s),
    () => now
  )
  return { tracker, store, credited, advance: (sec: number) => (now += sec * 1000) }
}

describe('temps de jeu des parties en cours', () => {
  it('compte la session à la fermeture du jeu', () => {
    const { tracker, credited, advance, store } = setup()
    tracker.begin('a', 42, 'game.exe', 'exit')
    advance(90)
    tracker.end('a')
    expect(credited['a']).toBe(90)
    expect(store.data).toEqual({})
  })

  it('les points de passage ne comptent jamais deux fois le même temps', () => {
    const { tracker, credited, advance } = setup()
    tracker.begin('a', 42, 'game.exe', 'exit')
    advance(60)
    expect(tracker.checkpoint()).toBe(true)
    advance(60)
    tracker.checkpoint()
    advance(30)
    tracker.end('a')
    expect(credited['a']).toBe(150)
  })

  it("garde la règle des 15 s pour l'application par défaut", () => {
    const { tracker, credited, advance } = setup()
    tracker.begin('rom', 7, 'mgba.exe', 'default-app')
    advance(5)
    expect(tracker.checkpoint()).toBe(false)
    tracker.end('rom')
    expect(credited['rom']).toBeUndefined()
  })

  it('au redémarrage, garde les jeux encore lancés et oublie les autres', async () => {
    const { tracker, store } = setup()
    tracker.begin('a', 1, 'game.exe', 'exit')
    tracker.begin('b', 2, 'fallen.exe', 'exit')
    const kept = await tracker.restore(async (s) => s.pid === 1)
    expect(kept.map(([id]) => id)).toEqual(['a'])
    expect(Object.keys(store.data)).toEqual(['a'])
  })

  it("cherche le nom de l'exécutable, chemin Windows ou Linux", () => {
    expect(exeName('C:\\Jeux\\PokeFallen\\Fallen.exe')).toBe('fallen.exe')
    expect(exeName('/usr/bin/mgba-qt')).toBe('mgba-qt')
  })

  it("un pid qui n'existe plus n'est pas le jeu", async () => {
    const s: Session = { pid: 2 ** 22 + 12345, exe: 'game.exe', startedAt: 0, from: 0, mode: 'exit' }
    expect(await isGameProcess(s, 'linux')).toBe(false)
  })

  it('reconnaît un processus encore lancé par son nom (Linux)', async () => {
    const s: Session = { pid: process.pid, exe: 'node', startedAt: 0, from: 0, mode: 'exit' }
    if (process.platform === 'linux') expect(await isGameProcess(s, 'linux')).toBe(true)
  })
})
