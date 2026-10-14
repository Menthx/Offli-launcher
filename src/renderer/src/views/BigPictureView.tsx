import { useEffect, useMemo, useRef, useState } from 'react'
import type { ViewProps } from '../App'
import { Cover, useCover } from '../components/Cover'
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from '../format'

/** Boutons au format "standard gamepad" (Xbox : A=0, B=1, X=2, Y=3) */
const BTN = { A: 0, B: 1, X: 2, LEFT: 14, RIGHT: 15 }

export function BigPictureView(p: ViewProps): React.JSX.Element {
  // Les jeux joués récemment d'abord, puis par ordre alphabétique
  const order = useMemo(
    () =>
      [...p.games].sort(
        (a, b) =>
          (p.stats[b.id]?.lastPlayed ?? 0) - (p.stats[a.id]?.lastPlayed ?? 0) || a.name.localeCompare(b.name, 'fr')
      ),
    // l'ordre ne bouge pas pendant la navigation, seulement quand la liste change
    [p.games]
  )
  const [idx, setIdx] = useState(0)
  const rail = useRef<HTMLDivElement>(null)
  const cur = order[Math.min(idx, order.length - 1)]
  const bg = useCover(cur?.id ?? '')

  const latest = useRef({ order, idx, p })
  latest.current = { order, idx, p }

  const move = (delta: number): void => setIdx((i) => Math.max(0, Math.min(order.length - 1, i + delta)))

  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>('.tile.cur')
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [idx])

  // Clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const { order, idx, p } = latest.current
      if (e.key === 'ArrowRight') move(1)
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'Enter' && order[idx]) p.onLaunch(order[idx])
      else if (e.key === 'Escape') p.onSwitchMode()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Manette : on lit l'état à chaque frame et on réagit aux nouveaux appuis
  useEffect(() => {
    let frame = 0
    const prev = new Set<number>()
    let lastAxisMove = 0
    const loop = (): void => {
      const pad = navigator.getGamepads().find((g) => g)
      if (pad) {
        const { order, idx, p } = latest.current
        const pressed = new Set(pad.buttons.flatMap((b, i) => (b.pressed ? [i] : [])))
        const hit = (b: number): boolean => pressed.has(b) && !prev.has(b)
        if (hit(BTN.RIGHT)) move(1)
        if (hit(BTN.LEFT)) move(-1)
        const x = pad.axes[0] ?? 0
        if (Math.abs(x) > 0.6 && performance.now() - lastAxisMove > 220) {
          move(x > 0 ? 1 : -1)
          lastAxisMove = performance.now()
        }
        if (hit(BTN.A) && order[idx]) p.onLaunch(order[idx])
        if (hit(BTN.X) && order[idx]) p.onFavorite(order[idx])
        if (hit(BTN.B)) p.onSwitchMode()
        prev.clear()
        pressed.forEach((b) => prev.add(b))
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!cur) {
    return (
      <div className="bp">
        <div className="bp-hero">
          <h2>Aucun jeu</h2>
          <p>Ajoute des jeux dans ton dossier puis rescanne depuis la bibliothèque.</p>
          <button className="ghost" onClick={p.onSwitchMode}>
            Retour à la bibliothèque
          </button>
        </div>
      </div>
    )
  }

  const st = p.stats[cur.id]
  return (
    <div className="bp">
      <div className="bp-bg" style={bg ? { backgroundImage: `url("${bg}")` } : undefined} />
      <div className="bp-hero">
        <div className="row-actions">
          <span className={`badge ${cur.kind === 'fangame' ? 'fan' : 'rom'}`}>{PLATFORM_LABEL[cur.platform]}</span>
          <span className="badge">{kindLabel(cur)}</span>
          {cur.baseRom && <span className="badge">Base {cur.baseRom.name}</span>}
          <span className="badge">{playtime(st?.playtimeSec ?? 0)} joués</span>
          {st?.favorite && <span className="badge fan">★ Favori</span>}
        </div>
        <h2>{cur.name}</h2>
        <div className="row-actions">
          <button className="play" onClick={() => p.onLaunch(cur)}>
            ▶ JOUER
          </button>
          <span className="muted">Dernière session : {lastPlayed(st?.lastPlayed)}</span>
        </div>
      </div>
      <div className="bp-rail" ref={rail}>
        {order.map((g, i) => (
          <button
            key={g.id}
            className={`tile ${i === idx ? 'cur' : ''}`}
            tabIndex={-1}
            onClick={() => (i === idx ? p.onLaunch(g) : setIdx(i))}
          >
            <Cover game={g} />
          </button>
        ))}
      </div>
      <footer className="bp-foot">
        <span>
          <span className="pad a">A</span>Jouer
        </span>
        <span>
          <span className="pad x">X</span>Favori
        </span>
        <span>
          <span className="pad b">B</span>Bibliothèque
        </span>
        <span>
          <kbd>←</kbd> <kbd>→</kbd> <kbd>Entrée</kbd> <kbd>Échap</kbd> au clavier
        </span>
      </footer>
    </div>
  )
}
