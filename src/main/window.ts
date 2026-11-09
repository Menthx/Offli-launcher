import { BrowserWindow, app } from 'electron'
import { join } from 'node:path'
// Window / taskbar icon (macOS uses the app icon)
import appIcon from '../../resources/icon.png?asset'

/** Window background before first paint (default Poké Ball theme bg), avoids a flash */
const BOOT_BACKGROUND = '#141518'

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: BOOT_BACKGROUND,
    autoHideMenuBar: true,
    title: 'Offli-Launcher',
    ...(process.platform === 'darwin' ? {} : { icon: appIcon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })
  // F11 toggles Library / Big Picture; caught here or Electron's default menu would use it for full screen
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault()
      win.webContents.send('view:toggle')
    }
  })
  // Dev only: F12 (or Ctrl+Shift+I / Cmd+Opt+I) toggles DevTools
  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      const key = input.key.toLowerCase()
      const inspect = key === 'i' && (input.control || input.meta) && (input.shift || input.alt)
      if (key === 'f12' || inspect) {
        event.preventDefault()
        win.webContents.toggleDevTools()
      }
    })
  }
  if (process.env['ELECTRON_RENDERER_URL']) void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}
