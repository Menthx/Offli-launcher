import { dialog, ipcMain, shell } from 'electron'
import type { LaunchResult, Settings } from '../../shared/types'
import { t } from '../../shared/i18n'
import type { MainContext } from '../context'
import { buildCommand, resolveAssociation, runCommand } from '../launcher'
import { scanLibrary } from '../scanner'
import { mergeSettings } from '../store'

/** Settings, dialogs, library, stats and game launching */
export function registerLibraryIpc(ctx: MainContext): void {
  const { settings, stats, library, hashes, covers } = ctx

  ipcMain.handle('settings:get', () => ctx.publicSettings())
  ipcMain.handle('settings:save', async (_e, input: Partial<Settings>) => {
    const { hasSteamGridDbKey: _ignored, ...patch } = input
    const coversChanged = 'useSteamGridDb' in patch || 'steamGridDbKey' in patch || 'useBaseRomCovers' in patch
    settings.data = mergeSettings(settings.data, {
      ...settings.data,
      ...patch
    })
    if (coversChanged) ctx.dropCovers()
    if ('language' in patch) ctx.applyLanguage()
    await settings.save()
    return ctx.publicSettings()
  })

  ipcMain.handle('dialog:folder', async () => {
    const r = await dialog.showOpenDialog(ctx.getWin()!, {
      properties: ['openDirectory']
    })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('dialog:file', async (_e, kind: 'image' | 'executable') => {
    const filters =
      kind === 'image'
        ? [
            {
              name: t('main.dialogImages'),
              extensions: ['png', 'jpg', 'jpeg', 'webp']
            }
          ]
        : process.platform === 'win32'
          ? [
              {
                name: t('main.dialogPrograms'),
                extensions: ['exe', 'bat', 'cmd']
              }
            ]
          : []
    const r = await dialog.showOpenDialog(ctx.getWin()!, {
      properties: ['openFile'],
      filters
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('library:get', () => ctx.games())
  ipcMain.handle('library:scan', async () => {
    library.data = await scanLibrary(settings.data.libraryPaths, hashes.data)
    await hashes.save()
    ctx.dropCovers()
    await library.save()
    return ctx.games()
  })

  ipcMain.handle('stats:get', () => stats.data)
  ipcMain.handle('stats:favorite', async (_e, id: string) => {
    const s = ctx.statsOf(id)
    s.favorite = !s.favorite
    await stats.save()
    return s
  })

  ipcMain.handle('game:rename', async (_e, id: string, name: string | null) => {
    const clean = name?.trim()
    if (clean) settings.data.nameOverrides[id] = clean
    else delete settings.data.nameOverrides[id]
    await settings.save()
    // SteamGridDB covers are searched by name: search again with the new one
    if (settings.data.useSteamGridDb) {
      await covers.dropSteamGridDb(id)
      ctx.dropCovers(id)
    }
    return ctx.games()
  })

  // Running games: id → launch time; a running game can't be launched again
  const running = new Map<string, number>()
  const pushRunning = (): void => ctx.getWin()?.webContents.send('game:running', Object.fromEntries(running))
  ipcMain.handle('game:running', () => Object.fromEntries(running))

  ipcMain.handle('game:launch', async (_e, id: string): Promise<LaunchResult> => {
    const game = ctx.findGame(id)
    if (!game) return { ok: false, error: t('main.gameNotFound') }
    if (running.has(id))
      return {
        ok: false,
        error: t('main.alreadyRunning', { name: game.name })
      }
    const built = buildCommand(game, settings.data)
    if (!built.ok) return { ok: false, error: built.error }
    // ROM without an emulator: run the associated app (mGBA…) directly
    const command = await resolveAssociation(built.command)
    running.set(id, Date.now())
    pushRunning()
    const error = await runCommand(
      command,
      (seconds) => {
        ctx.statsOf(id).playtimeSec += seconds
        void stats.save()
        ctx.pushStats()
      },
      () => {
        running.delete(id)
        pushRunning()
      }
    )
    if (error) {
      running.delete(id)
      pushRunning()
      return { ok: false, error }
    }
    ctx.statsOf(id).lastPlayed = Date.now()
    await stats.save()
    ctx.pushStats()
    return { ok: true }
  })
  ipcMain.handle('game:folder', (_e, id: string) => {
    const game = ctx.findGame(id)
    if (game) shell.showItemInFolder(game.path)
  })
  ipcMain.handle('window:fullscreen', (_e, on: boolean) => ctx.getWin()?.setFullScreen(!!on))
}
