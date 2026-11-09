import { dialog, ipcMain, shell } from 'electron'
import { GAME_STATUSES, cleanTags } from '../../shared/gameStatus'
import type { GameStats, LaunchResult, Settings } from '../../shared/types'
import { t } from '../../shared/i18n'
import type { MainContext } from '../context'
import type { Player } from '../play'
import { detectRunners } from '../runners'
import { scanLibrary } from '../scanner'
import { createDesktopShortcut } from '../shortcuts'
import { mergeSettings } from '../store'

/** Settings, dialogs, library, stats and game launching */
export function registerLibraryIpc(ctx: MainContext, player: Player): void {
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
  ipcMain.handle('stats:update', async (_e, id: string, patch: Pick<GameStats, 'status' | 'tags'>) => {
    const s = ctx.statsOf(id)
    if ('status' in patch) {
      if (patch.status && GAME_STATUSES.includes(patch.status)) s.status = patch.status
      else delete s.status
    }
    if ('tags' in patch) {
      const tags = cleanTags(patch.tags)
      if (tags.length) s.tags = tags
      else delete s.tags
    }
    await stats.save()
    ctx.pushStats()
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

  ipcMain.handle('runners:detect', () => detectRunners())
  ipcMain.handle('game:running', () => player.running())
  ipcMain.handle('game:launch', (_e, id: string): Promise<LaunchResult> => player.launch(id))
  ipcMain.handle('game:shortcut', async (_e, id: string) => {
    const game = ctx.findGame(id)
    const r = game ? await createDesktopShortcut(game) : { ok: false, error: t('main.gameNotFound') }
    ctx
      .getWin()
      ?.webContents.send('app:notify', r.ok ? { text: t('detail.shortcutDone') } : { text: r.error, error: true })
    return r
  })
  ipcMain.handle('game:folder', (_e, id: string) => {
    const game = ctx.findGame(id)
    if (game) shell.showItemInFolder(game.path)
  })
  ipcMain.handle('window:fullscreen', (_e, on: boolean) => ctx.getWin()?.setFullScreen(!!on))
}
