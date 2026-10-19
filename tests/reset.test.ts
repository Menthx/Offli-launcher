import { beforeEach, describe, expect, it, vi } from 'vitest'

const handlers = new Map<string, () => Promise<unknown>>()
const app = { isPackaged: false }
vi.mock('electron', () => ({
  app,
  dialog: {},
  ipcMain: { handle: (name: string, fn: () => Promise<unknown>) => handlers.set(name, fn) }
}))

const { registerDataIpc } = await import('../src/main/ipc/data')
const { DEFAULT_SETTINGS } = await import('../src/main/store')

const fakeCtx = () => {
  const file = <T>(data: T) => ({ data, save: vi.fn(async () => {}) })
  return {
    settings: file({ ...DEFAULT_SETTINGS, libraryPaths: ['C:/Jeux'], theme: 'doux', tutorialDone: true }),
    library: file([{ id: 'a', name: 'Uranium' }]),
    stats: file({ a: { playtimeSec: 60, favorite: true } }),
    dropCovers: vi.fn(),
    applyLanguage: vi.fn()
  }
}

describe('data:reset', () => {
  beforeEach(() => handlers.clear())

  it('empties game folders and the game list, keeps stats', async () => {
    const ctx = fakeCtx()
    registerDataIpc(ctx as never)
    expect(await handlers.get('data:reset')!()).toBe(true)
    expect(ctx.settings.data).toEqual(DEFAULT_SETTINGS)
    expect(ctx.settings.data.libraryPaths).toEqual([])
    expect(ctx.library.data).toEqual([])
    expect(ctx.library.save).toHaveBeenCalled()
    expect(ctx.stats.data.a.favorite).toBe(true)
  })

  it('does nothing in a packaged build', async () => {
    app.isPackaged = true
    const ctx = fakeCtx()
    registerDataIpc(ctx as never)
    expect(await handlers.get('data:reset')!()).toBe(false)
    expect(ctx.settings.data.libraryPaths).toEqual(['C:/Jeux'])
    app.isPackaged = false
  })
})
