import { BrowserWindow, app, dialog, ipcMain, net, protocol, shell } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Game, GameStats, LaunchResult, Settings } from '../shared/types'
import { CoverResolver } from './covers'
import { buildCommand, runCommand } from './launcher'
import { scanLibrary } from './scanner'
import { DEFAULT_SETTINGS, JsonFile, applyNames, emptyStats, mergeSettings } from './store'

const COVER_SCHEME = 'offli-img'

protocol.registerSchemesAsPrivileged([
  { scheme: COVER_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

// Permet d'isoler les données (tests, profil portable)
if (process.env['OFFLI_USER_DATA']) app.setPath('userData', process.env['OFFLI_USER_DATA'])

let win: BrowserWindow | null = null

app.whenReady().then(() => {
  const data = app.getPath('userData')
  const settings = new JsonFile<Settings>(join(data, 'settings.json'), structuredClone(DEFAULT_SETTINGS), mergeSettings)
  const stats = new JsonFile<Record<string, GameStats>>(join(data, 'stats.json'), {})
  // library.json garde les noms détectés ; les noms choisis sont appliqués à la lecture
  const library = new JsonFile<Game[]>(join(data, 'library.json'), [])
  const covers = new CoverResolver(join(data, 'covers'), () => settings.data)
  // Chemins d'images servis au rendu : seul ce qui a été résolu ici est accessible
  const coverPaths = new Map<string, string>()
  let coverVersion = 0

  const games = (): Game[] => applyNames(library.data, settings.data.nameOverrides)
  // Une version plus ancienne d'un fangame se lance et se résout comme un jeu à part entière
  const findGame = (id: string): Game | undefined => games().flatMap((g) => g.versions ?? [g]).find((g) => g.id === id)
  const statsOf = (id: string): GameStats => (stats.data[id] ??= emptyStats())
  const pushStats = (): void => win?.webContents.send('stats:changed', stats.data)

  protocol.handle(COVER_SCHEME, (req) => {
    const id = new URL(req.url).pathname.replace(/^\//, '')
    const path = coverPaths.get(id)
    if (!path) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(path).toString())
  })

  ipcMain.handle('settings:get', () => settings.data)
  ipcMain.handle('settings:save', async (_e, patch: Partial<Settings>) => {
    const coversChanged =
      'useSteamGridDb' in patch || 'steamGridDbKey' in patch || 'useBaseRomCovers' in patch
    settings.data = mergeSettings(settings.data, { ...settings.data, ...patch })
    if (coversChanged) {
      covers.invalidate()
      coverPaths.clear()
      coverVersion++
    }
    await settings.save()
    return settings.data
  })

  ipcMain.handle('dialog:folder', async () => {
    const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })
  ipcMain.handle('dialog:file', async (_e, kind: 'image' | 'executable') => {
    const filters =
      kind === 'image'
        ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
        : process.platform === 'win32'
          ? [{ name: 'Programmes', extensions: ['exe', 'bat', 'cmd'] }]
          : []
    const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('library:get', () => games())
  ipcMain.handle('library:scan', async () => {
    library.data = await scanLibrary(settings.data.libraryPath)
    covers.invalidate()
    coverPaths.clear()
    coverVersion++
    await library.save()
    return games()
  })

  ipcMain.handle('stats:get', () => stats.data)
  ipcMain.handle('stats:favorite', async (_e, id: string) => {
    const s = statsOf(id)
    s.favorite = !s.favorite
    await stats.save()
    return s
  })

  ipcMain.handle('cover:resolve', async (_e, id: string) => {
    const game = findGame(id)
    if (!game) return null
    const path = await covers.resolve(game)
    if (!path) return null
    coverPaths.set(id, path)
    return `${COVER_SCHEME}://cover/${id}?v=${coverVersion}`
  })
  ipcMain.handle('cover:set', async (_e, id: string, path: string | null) => {
    if (path) settings.data.coverOverrides[id] = path
    else delete settings.data.coverOverrides[id]
    await settings.save()
    covers.invalidate(id)
    coverPaths.delete(id)
    coverVersion++
    const game = findGame(id)
    const resolved = game && (await covers.resolve(game))
    if (!resolved) return null
    coverPaths.set(id, resolved)
    return `${COVER_SCHEME}://cover/${id}?v=${coverVersion}`
  })

  ipcMain.handle('game:rename', async (_e, id: string, name: string | null) => {
    const clean = name?.trim()
    if (clean) settings.data.nameOverrides[id] = clean
    else delete settings.data.nameOverrides[id]
    await settings.save()
    // L'image SteamGridDB est cherchée par nom : on la recherchera avec le nouveau
    if (settings.data.useSteamGridDb) {
      await covers.dropSteamGridDb(id)
      coverPaths.delete(id)
      coverVersion++
    }
    return games()
  })

  ipcMain.handle('game:launch', async (_e, id: string): Promise<LaunchResult> => {
    const game = findGame(id)
    if (!game) return { ok: false, error: 'Jeu introuvable, relance un scan.' }
    const built = buildCommand(game, settings.data)
    if (!built.ok) return { ok: false, error: built.error }
    const error = await runCommand(built.command, (seconds) => {
      statsOf(id).playtimeSec += seconds
      void stats.save()
      pushStats()
    })
    if (error) return { ok: false, error }
    statsOf(id).lastPlayed = Date.now()
    await stats.save()
    pushStats()
    return { ok: true }
  })
  ipcMain.handle('game:folder', (_e, id: string) => {
    const game = findGame(id)
    if (game) shell.showItemInFolder(game.path)
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1320',
    autoHideMenuBar: true,
    title: 'Offli-Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  win.on('closed', () => (win = null))
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
