import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: true }, shell: {} }))
const { appTarget, desktopEntry, parseLaunchArg, safeFileName } = await import('../src/main/shortcuts')

describe('raccourcis vers un jeu', () => {
  it('lit --launch avec ou sans signe égal', () => {
    expect(parseLaunchArg(['offli.exe', '--launch', 'abc123'])).toBe('abc123')
    expect(parseLaunchArg(['offli.exe', '--launch=abc123'])).toBe('abc123')
    expect(parseLaunchArg(['offli.exe', '--other'])).toBeUndefined()
  })

  it("vise l'exe portable ou l'AppImage plutôt que leur copie temporaire", () => {
    expect(appTarget({ PORTABLE_EXECUTABLE_FILE: 'D:\\Offli.exe' })).toBe('D:\\Offli.exe')
    expect(appTarget({ APPIMAGE: '/home/t/Offli.AppImage' })).toBe('/home/t/Offli.AppImage')
  })

  it('écrit un fichier .desktop avec les espaces protégés', () => {
    const entry = desktopEntry('Pokémon Z', '/home/t/Mes Apps/Offli.AppImage', ['--launch', 'abc'])
    expect(entry).toContain('Name=Pokémon Z')
    expect(entry).toContain('Exec="/home/t/Mes Apps/Offli.AppImage" --launch abc')
  })

  it('retire les caractères interdits dans un nom de fichier', () => {
    expect(safeFileName('Pokémon: Version "Cristal"?')).toBe('Pokémon Version Cristal')
    expect(safeFileName('???')).toBe('Offli')
  })
})
