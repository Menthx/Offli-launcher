import { useEffect, useRef, useState } from "react";

export interface MenuAction {
  label: string;
  icon: React.JSX.Element;
  run(): void | Promise<void>;
  /** Visible et atteignable aux flèches (annoncée par les lecteurs d'écran), mais sans effet */
  disabled?: boolean;
  /** Aide affichée sous le libellé, reliée par aria-describedby */
  hint?: string;
}

interface Props {
  /** Change quand le jeu affiché change : le menu se referme */
  gameId: string;
  favorite: boolean;
  onFavorite(): void;
  actions: MenuAction[];
}

/** Bouton favori (étoile) et bouton « ⋯ » qui ouvre le menu des autres actions du jeu */
export function GameActions({ gameId, favorite, onFavorite, actions }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const close = (focusButton: boolean): void => {
    setOpen(false);
    if (focusButton) more.current?.focus();
  };

  // Changement de jeu : le menu se referme
  useEffect(() => setOpen(false), [gameId]);

  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const onPointer = (e: PointerEvent): void => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent): void => {
    const list = items.current.filter(Boolean) as HTMLButtonElement[];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length;
      list[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const label = favorite ? "Retirer des favoris" : "Ajouter aux favoris";

  return (
    <div className="game-actions" ref={wrap}>
      <button
        className={`square-btn fav-btn ${favorite ? "on" : ""}`}
        onClick={onFavorite}
        aria-label={label}
        aria-pressed={favorite}
        title={label}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36 6.3 20.36l1.09-6.35-4.62-4.5 6.38-.93z"
            fill={favorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        ref={more}
        className="square-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Plus d'actions"
        title="Plus d'actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div className="action-menu" role="menu" aria-label="Actions du jeu" onKeyDown={onMenuKey}>
          {actions.map((a, i) => (
            <button
              key={a.label}
              ref={(el) => {
                items.current[i] = el;
              }}
              role="menuitem"
              tabIndex={-1}
              aria-disabled={a.disabled || undefined}
              aria-describedby={a.hint ? `menu-hint-${i}` : undefined}
              className={a.disabled ? "disabled" : undefined}
              onClick={() => {
                if (a.disabled) return;
                close(true);
                void a.run();
              }}
            >
              {a.icon}
              <span className="menu-text">
                {a.label}
                {a.hint && (
                  <span id={`menu-hint-${i}`} className="menu-hint">
                    {a.hint}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
