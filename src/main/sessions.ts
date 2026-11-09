import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { MIN_DEFAULT_APP_SESSION_SEC } from './launcher'

/** A running game, saved so its play time survives Offli being closed or crashing */
export interface Session {
  pid: number
  /** Process name to look for when Offli starts again (Game.exe, mgba.exe…) */
  exe: string
  /** Launch time, ms */
  startedAt: number
  /** Start of the time not credited yet, ms */
  from: number
  /** 'default-app': sessions under MIN_DEFAULT_APP_SESSION_SEC are not counted */
  mode: 'exit' | 'default-app'
}

export interface SessionStore {
  data: Record<string, Session>
  save(): Promise<void>
}

/** How often play time is written while a game runs */
export const CHECKPOINT_MS = 60_000

/** Credits play time as it goes, so at most one checkpoint is lost if Offli stops */
export class SessionTracker {
  constructor(
    private store: SessionStore,
    private credit: (id: string, seconds: number) => void,
    private now: () => number = Date.now
  ) {}

  begin(id: string, pid: number, exe: string, mode: Session['mode']): void {
    const t = this.now()
    this.store.data[id] = { pid, exe, startedAt: t, from: t, mode }
    void this.store.save()
  }

  /** Credits what is due for one session; false when it's too short to count yet */
  private settle(id: string, s: Session, t: number): boolean {
    if (s.mode === 'default-app' && t - s.startedAt < MIN_DEFAULT_APP_SESSION_SEC * 1000) return false
    const seconds = Math.round((t - s.from) / 1000)
    if (seconds > 0) this.credit(id, seconds)
    s.from = t
    return true
  }

  /** Credits every running session up to now; true if play time changed */
  checkpoint(): boolean {
    const t = this.now()
    let changed = false
    for (const [id, s] of Object.entries(this.store.data)) changed = this.settle(id, s, t) || changed
    if (changed) void this.store.save()
    return changed
  }

  /** The game closed: credits the rest and forgets it */
  end(id: string): void {
    const s = this.store.data[id]
    if (!s) return
    this.settle(id, s, this.now())
    delete this.store.data[id]
    void this.store.save()
  }

  /** Sessions left by the last run: still-running games are kept, the others are dropped */
  async restore(alive: (s: Session) => Promise<boolean>): Promise<[string, Session][]> {
    const kept: [string, Session][] = []
    for (const [id, s] of Object.entries(this.store.data)) {
      if (await alive(s)) kept.push([id, s])
      else delete this.store.data[id]
    }
    void this.store.save()
    return kept
  }

  get(id: string): Session | undefined {
    return this.store.data[id]
  }
}

/** Last path segment, Windows or POSIX */
export const exeName = (path: string): string => (path.split(/[\\/]/).pop() ?? path).toLowerCase()

/** The process exists (EPERM: exists but belongs to someone else) */
export function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const run = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve) =>
    execFile(cmd, args, { windowsHide: true, timeout: 5000 }, (err, out) => resolve(err ? '' : out))
  )

/** The pid is still the game (a pid can be reused by another program) */
export async function isGameProcess(s: Session, os: NodeJS.Platform = process.platform): Promise<boolean> {
  if (!pidExists(s.pid)) return false
  let line: string
  if (os === 'win32') line = await run('tasklist', ['/FI', `PID eq ${s.pid}`, '/FO', 'CSV', '/NH'])
  else if (os === 'linux') line = await readFile(`/proc/${s.pid}/cmdline`, 'utf8').catch(() => '')
  else line = await run('ps', ['-p', String(s.pid), '-o', 'command='])
  return line.toLowerCase().includes(s.exe)
}
