/** auto: check, download, install on click (Windows installer, AppImage); manual: check only, install from GitHub (portable, .deb, unsigned macOS); off: dev */
export type UpdateSupport =
  { mode: 'auto' } | { mode: 'manual'; reason: 'portable' | 'deb' | 'mac' } | { mode: 'off'; reason: 'dev' }

export interface UpdateEnv {
  isPackaged: boolean
  platform: NodeJS.Platform
  env: Record<string, string | undefined>
}

export function detectUpdateSupport({ isPackaged, platform, env }: UpdateEnv): UpdateSupport {
  if (!isPackaged) return { mode: 'off', reason: 'dev' }
  if (platform === 'darwin') return { mode: 'manual', reason: 'mac' }
  // The portable build runs from a temp folder: nothing to replace
  if (platform === 'win32')
    return env['PORTABLE_EXECUTABLE_DIR'] ? { mode: 'manual', reason: 'portable' } : { mode: 'auto' }
  // On Linux only the AppImage can replace itself
  return env['APPIMAGE'] ? { mode: 'auto' } : { mode: 'manual', reason: 'deb' }
}

export const RELEASES_URL = 'https://github.com/Menthx/Offli-launcher/releases/latest'

/** Translated by the renderer */
export function errorCode(err: unknown): 'network' | 'no-release' | 'unknown' {
  const msg = err instanceof Error ? err.message : String(err)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|net::|network/i.test(msg)) return 'network'
  if (/404|latest.*\.yml/i.test(msg)) return 'no-release'
  return 'unknown'
}
