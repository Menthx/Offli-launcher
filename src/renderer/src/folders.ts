import { t } from './i18n'
import { libraryStatus } from './tour'

/** Folder list logic for FolderList, framework-free: add without duplicates, remove, status line */
export function addFolder(paths: string[], dir: string | null | undefined): string[] {
  if (!dir || paths.includes(dir)) return paths
  return [...paths, dir]
}

export function removeFolder(paths: string[], dir: string): string[] {
  return paths.filter((d) => d !== dir)
}

/** 'N games found · X fangames, Y ROMs' (base ROMs excluded), or the current state */
export function folderStatus(paths: string[], games: { kind: string }[], scanning: boolean): string {
  if (!paths.length) return t('folders.none')
  if (scanning) return t('folders.scanning')
  return libraryStatus(games.filter((g) => g.kind !== 'baserom'))
}

export function addFolderLabel(paths: string[]): string {
  return paths.length ? t('folders.addAnother') : t('folders.add')
}
