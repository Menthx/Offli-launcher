import { app, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/types'
import { RELEASES_URL, detectUpdateSupport, errorCode } from './updateSupport'

/** In-app updates from published GitHub releases (drafts and prereleases ignored); nothing is downloaded or installed without a click */
export function setupUpdater(send: (status: UpdateStatus) => void): void {
  const support = detectUpdateSupport({
    isPackaged: app.isPackaged,
    platform: process.platform,
    env: process.env
  })
  let status: UpdateStatus =
    support.mode === 'off' ? { state: 'unsupported', reason: support.reason } : { state: 'idle' }
  const set = (next: UpdateStatus): void => {
    status = next
    send(status)
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  // No log in the player's console
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => set({ state: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    set(
      support.mode === 'manual'
        ? {
            state: 'unsupported',
            reason: support.reason,
            version: info.version
          }
        : { state: 'available', version: info.version }
    )
  )
  autoUpdater.on('update-not-available', () => set({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => set({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => set({ state: 'error', code: errorCode(err) }))

  const check = async (): Promise<void> => {
    if (support.mode === 'off') return
    try {
      const result = await autoUpdater.checkForUpdates()
      // Platform where electron-updater stays inactive (e.g. .deb): point to GitHub
      if (!result && support.mode === 'manual') set({ state: 'unsupported', reason: support.reason })
    } catch (err) {
      set({ state: 'error', code: errorCode(err) })
    }
  }

  ipcMain.handle('update:state', () => ({ status, version: app.getVersion() }))
  ipcMain.handle('update:check', () => check())
  ipcMain.handle('update:download', async () => {
    if (support.mode !== 'auto' || status.state !== 'available') return
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      set({ state: 'error', code: errorCode(err) })
    }
  })
  ipcMain.handle('update:install', () => {
    if (status.state === 'downloaded') autoUpdater.quitAndInstall()
  })
  ipcMain.handle('update:open-page', () => shell.openExternal(RELEASES_URL))

  if (support.mode !== 'off') void check()
}
