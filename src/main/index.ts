import { BrowserWindow, app, protocol } from 'electron'
import { COVER_SCHEME, createContext } from './context'
import { registerCoverIpc } from './ipc/covers'
import { registerDataIpc } from './ipc/data'
import { registerJournalIpc } from './ipc/journal'
import { registerLibraryIpc } from './ipc/library'
import { type Player, createPlayer } from './play'
import { parseLaunchArg } from './shortcuts'
import { setupUpdater } from './updater'
import { createWindow } from './window'

protocol.registerSchemesAsPrivileged([
  {
    scheme: COVER_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true }
  }
])

// Separate data folder (tests, portable profile)
if (process.env['OFFLI_USER_DATA']) app.setPath('userData', process.env['OFFLI_USER_DATA'])

// Taskbar button and its right-click menu belong to Offli (same id as the installer), not to Electron
if (process.platform === 'win32') app.setAppUserModelId('fr.menthx.offli')

// One Offli at a time: both would write the same files; opening it again shows the open window
if (!app.requestSingleInstanceLock()) app.exit(0)

let win: BrowserWindow | null = null
let player: Player | null = null

function openWindow(): void {
  win = createWindow()
  win.on('closed', () => (win = null))
}

/** Desktop shortcut or taskbar menu: `--launch <id>` */
async function launchFromArgs(argv: string[]): Promise<void> {
  const id = parseLaunchArg(argv)
  if (!id || !player) return
  // The renderer may still be loading: wait for it so the message shows
  if (win?.webContents.isLoading()) await new Promise<void>((r) => win!.webContents.once('did-finish-load', () => r()))
  const r = await player.launch(id)
  if (!r.ok) win?.webContents.send('app:notify', { text: r.error, error: true })
}

app.on('second-instance', (_e, argv) => {
  if (!win) openWindow()
  else if (!parseLaunchArg(argv)) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  void launchFromArgs(argv)
})

app.whenReady().then(() => {
  const ctx = createContext(app.getPath('userData'), () => win)
  player = createPlayer(ctx)
  registerLibraryIpc(ctx, player)
  registerCoverIpc(ctx)
  registerDataIpc(ctx)
  registerJournalIpc(ctx)

  openWindow()
  void player.restore()
  void launchFromArgs(process.argv)
  // Checks on startup (packaged app only); everything else on click
  setupUpdater((status) => win?.webContents.send('update:status', status))
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow()
  })
})

// Play time of games still running is written before quitting
app.on('before-quit', () => player?.flush())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
