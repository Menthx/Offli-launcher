import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Game, Settings } from "../../../shared/types";
import { THEMES } from "../theme";
import { TOUR_STEPS, libraryStatus, tourReduce } from "../tour";

interface Props {
  settings: Settings;
  games: Game[];
  scanning: boolean;
  selectedId: string | undefined;
  onSelect(id: string | undefined): void;
  onSave(patch: Partial<Settings>): Promise<void>;
  /** Tutoriel terminé ou passé (le réglage tutorialDone est enregistré par l'appelant) */
  onClose(): void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Rectangle englobant tous les éléments marqués data-tour="<cible>" */
function targetRect(target: string): Rect | null {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)];
  if (!els.length) return null;
  const rs = els.map((e) => e.getBoundingClientRect());
  const top = Math.min(...rs.map((r) => r.top));
  const left = Math.min(...rs.map((r) => r.left));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  const right = Math.max(...rs.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

const PAD = 8;
const BUBBLE_W = 320;

function Logo(): React.JSX.Element {
  return (
    <span className="tour-logo" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h6M15 12h6" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  );
}

/** Tutoriel du premier lancement : six étapes, fenêtres centrées ou bulles sur des éléments mis en lumière */
export function Tour({ settings, games, scanning, selectedId, onSelect, onSave, onClose }: Props): React.JSX.Element {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Hauteur réelle de la bulle, pour la garder entière dans la fenêtre
  const [cardH, setCardH] = useState(300);
  const dialog = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  // Sélection d'avant l'étape « fiche », rétablie en la quittant
  const selectionBefore = useRef<{ saved: boolean; id: string | undefined }>({ saved: false, id: undefined });
  const current = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;

  const go = useCallback(
    (action: "next" | "back" | "skip") => {
      const r = tourReduce(step, action);
      if ("done" in r) onClose();
      else setStep(r.step);
    },
    [step, onClose],
  );

  // Étape « fiche » : sans jeu sélectionné, on sélectionne le premier le temps de l'étape
  useEffect(() => {
    const sb = selectionBefore.current;
    if (current.id === "detail") {
      if (!sb.saved) {
        sb.saved = true;
        sb.id = selectedId;
        if (!selectedId) {
          const first = games.find((g) => g.kind !== "baserom");
          if (first) onSelect(first.id);
        }
      }
    } else if (sb.saved) {
      sb.saved = false;
      if (sb.id !== selectedId) onSelect(sb.id);
    }
  }, [current.id]);

  // Position de la mise en lumière, recalculée au redimensionnement
  useLayoutEffect(() => {
    if (current.kind !== "spotlight" || !current.target) {
      setRect(null);
      return;
    }
    const target = current.target;
    let frame = 0;
    const measure = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setRect(targetRect(target)));
    };
    measure();
    // La fiche peut s'ouvrir avec une animation : on remesure une fois celle-ci finie
    const late = window.setTimeout(measure, 450);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      window.removeEventListener("resize", measure);
    };
  }, [current, selectedId]);

  useLayoutEffect(() => {
    if (dialog.current) setCardH(dialog.current.offsetHeight);
  }, [step, rect]);

  // Focus sur le bouton principal à chaque étape
  useEffect(() => {
    primary.current?.focus();
  }, [step]);

  // Clavier : Échap passe, Entrée ou → avance, ← recule ; focus piégé dans la fenêtre
  const onKeyDown = (e: React.KeyboardEvent): void => {
    const onControl = (e.target as HTMLElement).closest("button, input, select");
    if (e.key === "Escape") {
      e.preventDefault();
      go("skip");
    } else if (e.key === "ArrowRight" || (e.key === "Enter" && !onControl)) {
      e.preventDefault();
      go("next");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go("back");
    } else if (e.key === "Tab" && dialog.current) {
      const f = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled), input")];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    }
  };

  const body = (): React.JSX.Element => {
    switch (current.id) {
      case "welcome":
        return (
          <>
            <p>Tous tes fangames et romhacks Pokémon au même endroit. On fait le tour en six étapes, ça prend une minute.</p>
          </>
        );
      case "folders":
        return (
          <>
            <ul className="tour-folders" aria-label="Dossiers de jeux">
              {settings.libraryPaths.map((dir) => (
                <li key={dir}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className="folder-path" title={dir}>
                    {dir}
                  </span>
                  <button
                    className="icon-btn"
                    aria-label={`Retirer ${dir}`}
                    title="Retirer"
                    onClick={() => onSave({ libraryPaths: settings.libraryPaths.filter((d) => d !== dir) })}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="tour-add"
              onClick={async () => {
                const dir = await window.offli.pickFolder();
                if (dir && !settings.libraryPaths.includes(dir))
                  await onSave({ libraryPaths: [...settings.libraryPaths, dir] });
              }}
            >
              + Ajouter un autre dossier
            </button>
            <p className="tour-status" role="status">
              {/* Les ROMs de base ne sont pas des jeux de la bibliothèque */}
              {scanning ? "Scan en cours…" : libraryStatus(games.filter((g) => g.kind !== "baserom"))}
            </p>
          </>
        );
      case "sidebar":
        return (
          <p>Fangames et ROMs ont chacun leur section. Tape un nom dans la recherche pour retrouver un jeu en un instant.</p>
        );
      case "detail":
        return (
          <p>
            L'étoile l'ajoute à tes favoris. Le bouton ⋯ permet d'ouvrir le dossier du jeu, de changer son image ou d'en
            choisir une sur SteamGridDB. Ton temps de jeu est compté tout seul.
          </p>
        );
      case "settings":
        return (
          <>
            <p>
              La roue dentée ouvre les paramètres : dossiers de jeux, émulateurs, images et thème. Choisis tes couleurs :
            </p>
            <div className="tour-themes" role="group" aria-label="Thème">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`tour-chip ${settings.theme === t.id ? "on" : ""}`}
                  aria-pressed={settings.theme === t.id}
                  onClick={() => onSave({ theme: t.id })}
                >
                  <span className="swatches" aria-hidden="true">
                    {t.swatches.slice(0, 3).map((c) => (
                      <span key={c} className="swatch" style={{ background: c }} />
                    ))}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </>
        );
      case "bigpicture":
        return (
          <>
            <p>Big Picture affiche tes jeux en grand, à piloter avec une manette.</p>
            <dl className="tour-keys">
              <dt>
                <kbd>F11</kbd>
              </dt>
              <dd>Ouvrir Big Picture</dd>
              <dt>
                <kbd>Échap</kbd> / <kbd>B</kbd>
              </dt>
              <dd>Revenir à la bibliothèque</dd>
              <dt>
                <kbd>A</kbd>
              </dt>
              <dd>Lancer le jeu sélectionné</dd>
            </dl>
          </>
        );
    }
  };

  // Bulle à côté de l'élément mis en lumière, gardée dans la fenêtre
  const bubbleStyle = (): React.CSSProperties | undefined => {
    if (!rect) return undefined;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampTop = (t: number): number => Math.max(16, Math.min(t, vh - cardH - 16));
    if (current.side === "right")
      // Élément bas (roue dentée) : la bulle s'aligne sur son bas ; sinon un peu sous son haut
      return {
        top: clampTop(rect.height < 80 ? rect.top + rect.height - cardH : rect.top + 40),
        left: Math.min(rect.left + rect.width + PAD + 16, vw - BUBBLE_W - 16),
      };
    if (current.side === "left")
      return { top: clampTop(rect.top), left: Math.max(16, rect.left - PAD - 16 - BUBBLE_W) };
    return { top: Math.max(16, rect.top - PAD - 16 - cardH), left: Math.max(16, Math.min(rect.left, vw - BUBBLE_W - 16)) };
  };

  // Sans élément à montrer (pas encore de dossier, pas de jeu), l'étape s'affiche en fenêtre centrée
  const spotlight = current.kind === "spotlight" && !!rect;

  return (
    <div className={`tour ${spotlight ? "is-spotlight" : "is-modal"}`} onKeyDown={onKeyDown}>
      {spotlight && rect ? (
        <div
          className="tour-ring"
          aria-hidden="true"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-scrim" aria-hidden="true" />
      )}
      <div
        ref={dialog}
        className={`tour-card ${spotlight ? `bubble side-${current.side}` : "modal-card"}`}
        style={spotlight ? bubbleStyle() : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        {current.id === "welcome" && <Logo />}
        <p className="tour-step">
          Étape {step + 1} sur {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title">{current.title}</h2>
        {body()}
        <div className="tour-foot">
          <span className="tour-dots" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => (
              <span key={s.id} className={`tour-dot ${i === step ? "on" : ""}`} />
            ))}
          </span>
          <span className="tour-actions">
            {step === 0 ? (
              <button className="ghost" onClick={() => go("skip")}>
                Passer le tutoriel
              </button>
            ) : (
              <>
                <button className="ghost" onClick={() => go("skip")}>
                  Passer
                </button>
                <button className="ghost" onClick={() => go("back")} aria-label="Étape précédente">
                  Retour
                </button>
              </>
            )}
            <button ref={primary} className="cta" onClick={() => go("next")}>
              {step === 0 ? "Commencer" : last ? "C'est parti" : "Suivant"}
            </button>
          </span>
        </div>
        {step === 0 && <p className="tour-hint">Tu pourras le revoir dans Paramètres.</p>}
        {/* Annonce du changement d'étape pour les lecteurs d'écran */}
        <p className="visually-hidden" aria-live="polite">
          Étape {step + 1} sur {TOUR_STEPS.length} : {current.title}
        </p>
      </div>
    </div>
  );
}
