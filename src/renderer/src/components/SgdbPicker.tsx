import { useEffect, useRef, useState } from "react";
import type { Game, SgdbImage, SgdbResult } from "../../../shared/types";

interface Props {
  game: Game;
  onClose(): void;
  /** Image choisie et enregistrée pour le jeu */
  onPicked(): void;
}

type Status = "idle" | "loading" | "error-key" | "error-network";

const MESSAGES: Record<Exclude<Status, "idle" | "loading">, string> = {
  "error-key": "SteamGridDB a refusé la clé API. Vérifie-la dans Paramètres > Images.",
  "error-network": "SteamGridDB ne répond pas. Vérifie ta connexion et réessaie.",
};

/** Fenêtre de choix d'une jaquette SteamGridDB ; tous les appels passent par le process principal */
export function SgdbPicker({ game, onClose, onPicked }: Props): React.JSX.Element {
  const [term, setTerm] = useState(game.originalName ?? game.name);
  const [matches, setMatches] = useState<{ id: number; name: string; year?: number }[]>([]);
  const [sgdbId, setSgdbId] = useState<number>();
  const [images, setImages] = useState<SgdbImage[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [picking, setPicking] = useState<number>();
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(document.activeElement);

  const fail = (r: SgdbResult<unknown>): boolean => {
    if (r.ok) return false;
    setStatus(r.error === "unauthorized" ? "error-key" : "error-network");
    return true;
  };

  const loadGrids = async (id: number, p: number): Promise<void> => {
    setStatus("loading");
    const r = await window.offli.sgdbGrids(id, p);
    if (fail(r) || !r.ok) return;
    setImages((prev) => (p === 0 ? r.value.images : [...prev, ...r.value.images]));
    setHasMore(r.value.hasMore);
    setPage(p);
    setStatus("idle");
  };

  const search = async (q: string): Promise<void> => {
    setStatus("loading");
    setImages([]);
    setHasMore(false);
    const r = await window.offli.sgdbSearch(q);
    if (fail(r) || !r.ok) return;
    setMatches(r.value);
    setSgdbId(r.value[0]?.id);
    if (r.value[0]) await loadGrids(r.value[0].id, 0);
    else setStatus("idle");
  };

  // Première recherche à l'ouverture seulement ; le focus revient au bouton d'origine à la fermeture
  useEffect(() => {
    void search(term);
    const back = opener.current;
    return () => (back as HTMLElement | null)?.focus?.();
  }, []);

  // Focus piégé dans la fenêtre, Échap ferme
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled), input, select")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  const pick = async (img: SgdbImage): Promise<void> => {
    setPicking(img.id);
    const r = await window.offli.sgdbPick(game.id, img.id);
    setPicking(undefined);
    if (fail(r)) return;
    onPicked();
    onClose();
  };

  const loading = status === "loading";

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        ref={dialog}
        className="modal sgdb"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sgdb-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="modal-head">
          <h2 id="sgdb-title">Choisir sur SteamGridDB</h2>
          <button className="round-close" onClick={onClose} aria-label="Fermer" title="Fermer">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <form
          className="sgdb-search"
          onSubmit={(e) => {
            e.preventDefault();
            void search(term);
          }}
        >
          <label htmlFor="sgdb-term" className="visually-hidden">
            Nom du jeu sur SteamGridDB
          </label>
          <input id="sgdb-term" value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
          <button className="ghost" type="submit" disabled={loading || !term.trim()}>
            Rechercher
          </button>
        </form>

        {matches.length > 1 && (
          <div className="field field-inline">
            <label htmlFor="sgdb-game">Jeu</label>
            <select
              id="sgdb-game"
              value={sgdbId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSgdbId(id);
                void loadGrids(id, 0);
              }}
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.year ? ` (${m.year})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Zone de hauteur fixe : la fenêtre ne change pas de taille pendant le chargement */}
        <div className="sgdb-results" aria-busy={loading}>
          {status === "error-key" || status === "error-network" ? (
            <p className="sgdb-message" role="alert">
              {MESSAGES[status]}
            </p>
          ) : !loading && images.length === 0 ? (
            <p className="sgdb-message">
              {matches.length === 0
                ? "Aucun jeu trouvé sous ce nom. Essaie un autre nom."
                : "Aucune jaquette pour ce jeu."}
            </p>
          ) : (
            <div className="sgdb-grid">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  className="sgdb-thumb"
                  aria-label={`Jaquette ${i + 1} sur ${images.length}${hasMore ? " (d'autres disponibles)" : ""}`}
                  disabled={picking !== undefined}
                  onClick={() => void pick(img)}
                >
                  <img src={img.thumb} alt="" loading="lazy" draggable={false} />
                  {picking === img.id && <span className="sgdb-picking">Téléchargement…</span>}
                </button>
              ))}
            </div>
          )}
          {loading && (
            <p className="sgdb-message" role="status">
              Chargement…
            </p>
          )}
        </div>

        <footer className="sgdb-foot">
          {hasMore && sgdbId !== undefined && (
            <button className="ghost" disabled={loading} onClick={() => void loadGrids(sgdbId, page + 1)}>
              Plus d'images
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
