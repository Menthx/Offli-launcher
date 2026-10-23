import { ipcMain, shell } from 'electron'
import type { DetectedLink, GameJournal } from '../../shared/types'
import { normalizeUrl } from '../../shared/links'
import type { MainContext } from '../context'
import { detectLinks } from '../journal/detect'
import { cleanJournal, emptyJournal } from '../journal/store'

/** Per-game notes and community links */
export function registerJournalIpc(ctx: MainContext): void {
  const { journal } = ctx
  // Folder contents rarely change while the app runs: read once per game
  const detected = new Map<string, Promise<DetectedLink[]>>()

  // A new version becomes the game's id: notes saved under another version follow it
  const adopt = (id: string): void => {
    if (journal.data[id]) return
    const game = ctx.findGame(id)
    const from = game?.versions?.find((v) => v.id !== id && journal.data[v.id])?.id
    if (!from) return
    journal.data[id] = journal.data[from]
    delete journal.data[from]
  }

  ipcMain.handle('journal:get', (_e, id: string): GameJournal => {
    adopt(id)
    return journal.data[id] ?? emptyJournal()
  })
  ipcMain.handle('journal:save', async (_e, id: string, input: unknown): Promise<GameJournal> => {
    adopt(id)
    const clean = cleanJournal(input)
    if (clean.notes.length || clean.links.length || clean.hiddenLinks.length) journal.data[id] = clean
    else delete journal.data[id]
    await journal.save()
    return clean
  })
  ipcMain.handle('journal:detect', (_e, id: string): Promise<DetectedLink[]> => {
    const game = ctx.findGame(id)
    if (!game) return Promise.resolve([])
    if (!detected.has(id)) detected.set(id, detectLinks(game.versions ?? [game]))
    return detected.get(id)!
  })
  ipcMain.handle('link:open', async (_e, url: string) => {
    const clean = typeof url === 'string' ? normalizeUrl(url) : null
    if (clean) await shell.openExternal(clean)
  })
}
