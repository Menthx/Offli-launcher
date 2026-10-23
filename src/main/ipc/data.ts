import { app, dialog, ipcMain } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import type { DataResult } from '../../shared/types'
import { makeBackup, readBackup } from '../backup'
import type { MainContext } from '../context'
import { DEFAULT_SETTINGS } from '../store'

/** Backup export / import through a user-picked JSON file, and settings reset */
export function registerDataIpc(ctx: MainContext): void {
  const filters = [{ name: 'JSON', extensions: ['json'] }]

  ipcMain.handle('data:export', async (): Promise<DataResult | null> => {
    const day = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(ctx.getWin()!, {
      defaultPath: `offli-launcher-${day}.json`,
      filters
    })
    if (r.canceled || !r.filePath) return null
    try {
      await writeFile(
        r.filePath,
        JSON.stringify(makeBackup(ctx.settings.data, ctx.stats.data, new Date(), ctx.journal.data), null, 2)
      )
      return { ok: true }
    } catch {
      return { ok: false, error: 'io' }
    }
  })

  ipcMain.handle('data:import', async (): Promise<DataResult | null> => {
    const r = await dialog.showOpenDialog(ctx.getWin()!, {
      properties: ['openFile'],
      filters
    })
    if (r.canceled || !r.filePaths[0]) return null
    let text: string
    try {
      text = await readFile(r.filePaths[0], 'utf8')
    } catch {
      return { ok: false, error: 'io' }
    }
    const backup = readBackup(text, ctx.settings.data)
    if (!backup) return { ok: false, error: 'invalid' }
    ctx.settings.data = backup.settings
    ctx.stats.data = backup.stats
    // An older backup has no notes: the current ones stay
    if (backup.journal) ctx.journal.data = backup.journal
    await Promise.all([ctx.settings.save(), ctx.stats.save(), ctx.journal.save()])
    ctx.dropCovers()
    ctx.applyLanguage()
    ctx.pushStats()
    return { ok: true }
  })

  // Favorites, play time and notes are player data, not settings: they stay
  // Development only: the button is hidden in packaged builds
  ipcMain.handle('data:reset', async (): Promise<boolean> => {
    if (app.isPackaged) return false
    ctx.settings.data = structuredClone(DEFAULT_SETTINGS)
    ctx.library.data = []
    try {
      await Promise.all([ctx.settings.save(), ctx.library.save()])
    } catch {
      return false
    }
    ctx.dropCovers()
    ctx.applyLanguage()
    return true
  })
}
