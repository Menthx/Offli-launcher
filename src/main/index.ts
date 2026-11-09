import { BrowserWindow, app, protocol } from 'electron'
import { COVER_SCHEME, createContext } from './context'
import { registerCoverIpc } from './ipc/covers'
import { registerDataIpc } from './ipc/data'
import { registerJournalIpc } from './ipc/journal'
import { registerLibraryIpc } from './ipc/library'
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

let win: BrowserWindow | null = null

function openWindow(): void {
  win = createWindow()
  win.on('closed', () => (win = null))
}

app.whenReady().then(() => {
  const ctx = createContext(app.getPath('userData'), () => win)
  registerLibraryIpc(ctx)
  registerCoverIpc(ctx)
  registerDataIpc(ctx)
  registerJournalIpc(ctx)

  openWindow()
  // Checks on startup (packaged app only); everything else on click
  setupUpdater((status) => win?.webContents.send('update:status', status))
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
