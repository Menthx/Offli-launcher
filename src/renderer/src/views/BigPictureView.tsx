import { useEffect, useMemo, useRef, useState } from "react";
import type { ViewProps } from "../App";
import { Cover, useCover } from "../components/Cover";
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from "../format";

/** Boutons au format « standard gamepad » (Xbox : A=0, B=1, X=2, Y=3) */
const BTN = { A: 0, B: 1, X: 2, LEFT: 14, RIGHT: 15 };

interface Props extends ViewProps {
  /** Retour à la bibliothèque (Échap, bouton B) */
  onExit(): void;
}

/** Affichage plein écran pour jouer au clavier ou à la manette */
export function BigPictureView(p: Props): React.JSX.Element {
  // Favoris d'abord, puis les jeux joués récemment, puis l'ordre alphabétique.
  // Les ROMs de base ne sont pas des jeux de la bibliothèque.
  const order = useMemo(
    () =>
      p.games
        .filter((g) => g.kind !== "baserom")
        .sort(
          (a, b) =>
            Number(!!p.stats[b.id]?.favorite) - Number(!!p.stats[a.id]?.favorite) ||
            (p.stats[b.id]?.lastPlayed ?? 0) - (p.stats[a.id]?.lastPlayed ?? 0) ||
            a.name.localeCompare(b.name, "fr"),
        ),
    // l'ordre ne bouge pas pendant la navigation, seulement quand la liste change
    [p.games],
  );
  const [idx, setIdx] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const cur = order[Math.min(idx, order.length - 1)];
  const bg = useCover(cur?.id ?? "");

  const latest = useRef({ order, idx, p });
  latest.current = { order, idx, p };

  const move = (delta: number): void =>
    setIdx((i) => Math.max(0, Math.min(latest.current.order.length - 1, i + delta)));

  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>(".tile.cur");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [idx]);

  // Clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const { order, idx, p } = latest.current;
      // Un bouton qui a le focus garde Entrée pour lui (JOUER, retour)
      const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "Enter" && !onButton && order[idx]) p.onLaunch(order[idx]);
      else if ((e.key === "f" || e.key === "F") && order[idx]) p.onFavorite(order[idx]);
      else if (e.key === "Escape") p.onExit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Manette : on lit l'état à chaque frame et on réagit aux nouveaux appuis
  useEffect(() => {
    let frame = 0;
    const prev = new Set<number>();
    let lastAxisMove = 0;
    const loop = (): void => {
      const pad = navigator.getGamepads().find((g) => g);
      if (pad) {
        const { order, idx, p } = latest.current;
        const pressed = new Set(pad.buttons.flatMap((b, i) => (b.pressed ? [i] : [])));
        const hit = (b: number): boolean => pressed.has(b) && !prev.has(b);
        if (hit(BTN.RIGHT)) move(1);
        if (hit(BTN.LEFT)) move(-1);
        const x = pad.axes[0] ?? 0;
        if (Math.abs(x) > 0.6 && performance.now() - lastAxisMove > 220) {
          move(x > 0 ? 1 : -1);
          lastAxisMove = performance.now();
        }
        if (hit(BTN.A) && order[idx]) p.onLaunch(order[idx]);
        if (hit(BTN.X) && order[idx]) p.onFavorite(order[idx]);
        if (hit(BTN.B)) p.onExit();
        prev.clear();
        pressed.forEach((b) => prev.add(b));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!cur) {
    return (
      <div className="bp">
        <div className="bp-hero">
          <h2>Aucun jeu</h2>
          <p className="muted">Ajoute un dossier de jeux dans les paramètres de la bibliothèque.</p>
          <button className="ghost" onClick={p.onExit} autoFocus>
            Retour à la bibliothèque
          </button>
        </div>
      </div>
    );
  }

  const st = p.stats[cur.id];
  return (
    <div className="bp">
      <div className="bp-bg" style={bg ? { backgroundImage: `url("${bg}")` } : undefined} />
      <button className="ghost bp-exit" onClick={p.onExit}>
        ← Bibliothèque
      </button>
      <div className="bp-hero" aria-live="polite">
        <div className="row-actions">
          <span className={`badge ${cur.kind === "fangame" ? "fan" : "rom"}`}>
            {PLATFORM_LABEL[cur.platform]}
          </span>
          <span className="badge">{kindLabel(cur)}</span>
          {cur.baseRom && <span className="badge">Base {cur.baseRom.name}</span>}
          {cur.versions && <span className="badge">{cur.versions.length} versions</span>}
          <span className="badge">{playtime(st?.playtimeSec ?? 0)} joués</span>
          {st?.favorite && <span className="badge fav">★ Favori</span>}
        </div>
        <h2>{cur.name}</h2>
        <div className="row-actions">
          <button className="play" onClick={() => p.onLaunch(cur)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 1.5v13l11-6.5z" fill="currentColor" />
            </svg>
            JOUER
          </button>
          <span className="bp-last">Dernière session : {lastPlayed(st?.lastPlayed)}</span>
        </div>
      </div>
      <div className="bp-rail" ref={rail} role="listbox" aria-label="Jeux" aria-activedescendant={`bp-${cur.id}`}>
        {order.map((g, i) => (
          <button
            key={g.id}
            id={`bp-${g.id}`}
            role="option"
            aria-selected={i === idx}
            aria-label={g.name}
            className={`tile ${i === idx ? "cur" : ""}`}
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
          <kbd>←</kbd> <kbd>→</kbd> <kbd>Entrée</kbd> <kbd>F</kbd> <kbd>Échap</kbd> au clavier
        </span>
      </footer>
    </div>
  );
}
