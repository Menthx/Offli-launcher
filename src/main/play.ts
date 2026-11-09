import { join } from 'node:path'
import { t } from '../shared/i18n'
import type { LaunchResult } from '../shared/types'
import type { MainContext } from './context'
import { type Command, buildCommand, resolveAssociation, runCommand } from './launcher'
import { CHECKPOINT_MS, type Session, SessionTracker, exeName, isGameProcess, pidExists } from './sessions'
import { updateJumpList } from './shortcuts'
import { JsonFile } from './store'

/** How often a game found running at startup is checked */
const ADOPTED_POLL_MS = 5000

/** Game launching, running games, play time and the window while playing */
export function createPlayer(ctx: MainContext) {
  const { settings, stats } = ctx
  const store = new JsonFile<Record<string, Session>>(join(ctx.data, 'sessions.json'), {})
  const tracker = new SessionTracker(store, (id, seconds) => (ctx.statsOf(id).playtimeSec += seconds))
  // Running games: id → launch time; a running game can't be launched again
  const running = new Map<string, number>()
  // The window was minimized for a game: it comes back when the last one closes
  let minimized = false

  const pushRunning = (): void => ctx.getWin()?.webContents.send('game:running', Object.fromEntries(running))
  const saveStats = (): void => {
    void stats.save()
    ctx.pushStats()
  }
  const jumpList = (): void => updateJumpList(ctx.games(), stats.data)

  const bringBack = (): void => {
    const win = ctx.getWin()
    if (!minimized || running.size || !win) return
    minimized = false
    if (win.isMinimized()) win.restore()
    win.show()
    // Windows only lets a background app take the focus this way
    win.setAlwaysOnTop(true)
    win.focus()
    win.setAlwaysOnTop(false)
  }

  const ended = (id: string): void => {
    tracker.end(id)
    running.delete(id)
    saveStats()
    pushRunning()
    bringBack()
  }

  const timer = setInterval(() => tracker.checkpoint() && saveStats(), CHECKPOINT_MS)
  timer.unref()

  /** Process name to find the game again: the game itself under Wine, not wine */
  const processName = (c: Command): string => exeName(c.cmd === settings.data.winePath ? (c.args[0] ?? c.cmd) : c.cmd)

  async function launch(id: string): Promise<LaunchResult> {
    const game = ctx.findGame(id)
    if (!game) return { ok: false, error: t('main.gameNotFound') }
    if (running.has(id)) return { ok: false, error: t('main.alreadyRunning', { name: game.name }) }
    const built = buildCommand(game, settings.data)
    if (!built.ok) return { ok: false, error: built.error }
    // ROM without an emulator: run the associated app (mGBA…) directly
    const command = await resolveAssociation(built.command)
    const tracked = command.playtime !== 'none'
    running.set(id, Date.now())
    pushRunning()
    const error = await runCommand(
      command,
      () => {},
      () => (tracked ? ended(id) : (running.delete(id), pushRunning())),
      (pid) =>
        tracked &&
        tracker.begin(id, pid, processName(command), command.playtime === 'default-app' ? 'default-app' : 'exit')
    )
    if (error) {
      running.delete(id)
      pushRunning()
      return { ok: false, error }
    }
    ctx.statsOf(id).lastPlayed = Date.now()
    saveStats()
    jumpList()
    // Explorer or xdg-open return at once: no way to know when to come back
    const win = ctx.getWin()
    if (tracked && settings.data.minimizeOnLaunch && win && !win.isMinimized()) {
      minimized = true
      win.minimize()
    }
    return { ok: true }
  }

  /** Games still running from the last time Offli was open */
  async function restore(): Promise<void> {
    for (const [id, s] of await tracker.restore((s) => isGameProcess(s))) {
      running.set(id, s.startedAt)
      const poll = setInterval(() => {
        if (pidExists(s.pid)) return
        clearInterval(poll)
        ended(id)
      }, ADOPTED_POLL_MS)
    }
    pushRunning()
    jumpList()
  }

  /** Quitting: play time up to now is written before the app exits */
  function flush(): void {
    tracker.checkpoint()
    store.saveSync()
    stats.saveSync()
  }

  return { launch, restore, flush, running: () => Object.fromEntries(running) }
}

export type Player = ReturnType<typeof createPlayer>
