import { BrowserWindow, app, dialog, ipcMain, net, protocol, shell } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Game, GameStats, LaunchResult, SgdbResult, Settings } from '../shared/types'
import { CoverResolver } from './covers'
import type { HashCache } from './baseRoms'
import { buildCommand, resolveAssociation, runCommand } from './launcher'
import { scanLibrary } from './scanner'
import { SgdbError, type SgdbGrid, SteamGridDb } from './steamgriddb'
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
  const hashes = new JsonFile<HashCache>(join(data, 'hashes.json'), {})
  const covers = new CoverResolver(join(data, 'covers'), () => settings.data)
  // Chemins d'images servis au rendu : seul ce qui a été résolu ici est accessible
  const coverPaths = new Map<string, string>()
  let coverVersion = 0
  // Choix d'image SteamGridDB : miniatures téléchargées ici et images proposées (le rendu ne passe que des ids)
  const sgdbThumbs = new Map<string, string>()
  const sgdbGrids = new Map<number, SgdbGrid>()
  const sgdbDir = join(data, 'covers', 'sgdb')
  const sgdb = (): SteamGridDb | null => (settings.data.steamGridDbKey ? new SteamGridDb(settings.data.steamGridDbKey) : null)
  const sgdbFail = (err: unknown): SgdbResult<never> => ({
    ok: false,
    error: err instanceof SgdbError ? err.kind : 'network'
  })
  const ext = (data: Buffer): string => (data[0] === 0xff && data[1] === 0xd8 ? '.jpg' : data.subarray(8, 12).toString('ascii') === 'WEBP' ? '.webp' : '.png')

  // La clé SteamGridDB reste dans le process principal : le rendu sait seulement qu'elle existe
  const publicSettings = (): Settings => ({
    ...settings.data,
    steamGridDbKey: '',
    hasSteamGridDbKey: !!settings.data.steamGridDbKey
  })

  const games = (): Game[] => applyNames(library.data, settings.data.nameOverrides)
  // Une version plus ancienne d'un fangame se lance et se résout comme un jeu à part entière
  const findGame = (id: string): Game | undefined => games().flatMap((g) => g.versions ?? [g]).find((g) => g.id === id)
  const statsOf = (id: string): GameStats => (stats.data[id] ??= emptyStats())
  const pushStats = (): void => win?.webContents.send('stats:changed', stats.data)

  protocol.handle(COVER_SCHEME, (req) => {
    const url = new URL(req.url)
    const id = url.pathname.replace(/^\//, '')
    // offli-img://sgdb/<id> : miniature SteamGridDB ; offli-img://cover/<id> : jaquette d'un jeu
    const path = url.host === 'sgdb' ? sgdbThumbs.get(id) : coverPaths.get(id)
    if (!path) return new Response(null, { status: 404 })
    return net.fetch(pathToFileURL(path).toString())
  })

  ipcMain.handle('settings:get', () => publicSettings())
  ipcMain.handle('settings:save', async (_e, input: Partial<Settings>) => {
    const { hasSteamGridDbKey: _ignored, ...patch } = input
    const coversChanged =
      'useSteamGridDb' in patch || 'steamGridDbKey' in patch || 'useBaseRomCovers' in patch
    settings.data = mergeSettings(settings.data, { ...settings.data, ...patch })
    if (coversChanged) {
      covers.invalidate()
      coverPaths.clear()
      coverVersion++
    }
    await settings.save()
    return publicSettings()
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
    library.data = await scanLibrary(settings.data.libraryPaths, hashes.data)
    await hashes.save()
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

  // Choix d'une jaquette sur SteamGridDB : rien n'est demandé tant que la fenêtre n'est pas ouverte
  ipcMain.handle('sgdb:search', async (_e, term: string): Promise<SgdbResult<{ id: number; name: string; year?: number }[]>> => {
    const client = sgdb()
    if (!client) return { ok: false, error: 'unauthorized' }
    try {
      return { ok: true, value: await client.search(String(term)) }
    } catch (err) {
      return sgdbFail(err)
    }
  })
  ipcMain.handle('sgdb:grids', async (_e, gameId: number, page: number) => {
    const client = sgdb()
    if (!client) return { ok: false, error: 'unauthorized' }
    try {
      const { grids, hasMore } = await client.grids(Number(gameId), Math.max(0, Number(page) || 0))
      await mkdir(join(sgdbDir, 'thumbs'), { recursive: true })
      const images = await Promise.all(
        grids.map(async (g) => {
          sgdbGrids.set(g.id, g)
          if (!sgdbThumbs.has(String(g.id))) {
            const bytes = await client.download(g.thumb)
            const path = join(sgdbDir, 'thumbs', String(g.id) + ext(bytes))
            await writeFile(path, bytes)
            sgdbThumbs.set(String(g.id), path)
          }
          return { id: g.id, thumb: `${COVER_SCHEME}://sgdb/${g.id}`, width: g.width, height: g.height }
        })
      )
      return { ok: true, value: { images, hasMore } }
    } catch (err) {
      return sgdbFail(err)
    }
  })
  ipcMain.handle('sgdb:pick', async (_e, id: string, imageId: number) => {
    const client = sgdb()
    const grid = sgdbGrids.get(Number(imageId))
    if (!client || !grid || !findGame(id)) return { ok: false, error: 'network' }
    try {
      const bytes = await client.download(grid.url)
      await mkdir(sgdbDir, { recursive: true })
      const path = join(sgdbDir, `${id}-${grid.id}${ext(bytes)}`)
      await writeFile(path, bytes)
      settings.data.coverOverrides[id] = path
      await settings.save()
      covers.invalidate(id)
      coverPaths.delete(id)
      coverVersion++
      return { ok: true, value: null }
    } catch (err) {
      return sgdbFail(err)
    }
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
    // ROM sans émulateur configuré : l'application associée (mGBA…) est lancée directement
    const command = await resolveAssociation(built.command)
    const error = await runCommand(command, (seconds) => {
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
  ipcMain.handle('window:fullscreen', (_e, on: boolean) => win?.setFullScreen(!!on))
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
    backgroundColor: '#16122b',
    autoHideMenuBar: true,
    title: 'Offli-Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  win.on('closed', () => (win = null))
  // En développement : F12 (ou Ctrl+Maj+I, Cmd+Opt+I) ouvre et ferme les outils de développement
  // F11 bascule Bibliothèque / Big Picture. Intercepté ici, sinon le menu par défaut
  // d'Electron le prend pour son propre plein écran et la page ne le reçoit jamais.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault()
      win?.webContents.send('view:toggle')
    }
  })
  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      const key = input.key.toLowerCase()
      const inspect = key === 'i' && (input.control || input.meta) && (input.shift || input.alt)
      if (key === 'f12' || inspect) {
        event.preventDefault()
        win?.webContents.toggleDevTools()
      }
    })
  }
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
