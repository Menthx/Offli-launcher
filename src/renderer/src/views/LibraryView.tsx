import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, GameStats } from "../../../shared/types";
import type { ViewProps } from "../App";
import { Cover } from "../components/Cover";
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from "../format";

type Filter =
  | "all"
  | "fav"
  | "fangame"
  | "gba"
  | "nds"
  | "gb"
  | "3ds"
  | "new"
  | "base";

const FILTERS: { id: Filter; label: string; group?: string }[] = [
  { id: "all", label: "Tous les jeux", group: "Bibliothèque" },
  { id: "fav", label: "Favoris" },
  { id: "new", label: "Jamais lancés" },
  { id: "fangame", label: "Fangames PC", group: "Plateformes" },
  { id: "gba", label: "GBA" },
  { id: "nds", label: "NDS" },
  { id: "gb", label: "GB / GBC" },
  { id: "3ds", label: "3DS" },
  { id: "base", label: "ROMs de base", group: "Autres" },
];

/**
 * Sections de « Tous les jeux » : les favoris en tête (un favori reste aussi dans
 * sa catégorie), puis les catégories dans l'ordre de la barre latérale
 */
const SECTIONS: { filter: Filter; label: string }[] = [
  { filter: "fav", label: "Favoris" },
  { filter: "fangame", label: "Fangames" },
  { filter: "gba", label: "Romhacks GBA" },
  { filter: "nds", label: "Romhacks NDS" },
  { filter: "gb", label: "Romhacks GB / GBC" },
  { filter: "3ds", label: "Romhacks 3DS" },
];

function matches(f: Filter, g: Game, s: GameStats | undefined): boolean {
  // Les ROMs officielles non modifiées ne sont pas des jeux de la bibliothèque : elles ont leur propre entrée
  if (g.kind === "baserom" || f === "base")
    return f === "base" && g.kind === "baserom";
  switch (f) {
    case "all":
      return true;
    case "fav":
      return !!s?.favorite;
    case "new":
      return !s?.lastPlayed;
    case "fangame":
      return g.kind === "fangame";
    case "gb":
      return g.platform === "gb" || g.platform === "gbc";
    default:
      return g.platform === f;
  }
}

interface Props extends ViewProps {
  scanning: boolean;
  onOpenSettings(): void;
  /** Images choisies par l'utilisateur, par id de jeu */
  customCovers: Record<string, string>;
  onCoverChanged(id: string): void;
  onRename(game: Game, name: string | null): void;
}

interface GridProps {
  games: Game[];
  stats: Record<string, GameStats>;
  selectedId: string | undefined;
  onSelect(id: string): void;
  onLaunch(game: Game): void;
}

function GameGrid(p: GridProps): React.JSX.Element {
  return (
    <div className="grid">
      {p.games.map((g) => (
        <button
          key={g.id}
          className={`card ${g.id === p.selectedId ? "sel" : ""}`}
          onClick={() => p.onSelect(g.id)}
          onDoubleClick={() => p.onLaunch(g)}
        >
          <Cover game={g} />
          <span className="card-title">{g.name}</span>
          <span className="card-meta">
            <span>{kindLabel(g)}</span>
            <span>{playtime(p.stats[g.id]?.playtimeSec ?? 0)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Nom du jeu, modifiable d'un clic : Entrée valide, Échap annule, vide rétablit le nom détecté */
function NameEditor({
  game,
  onRename,
}: {
  game: Game;
  onRename(game: Game, name: string | null): void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(game.name);
  const cancelled = useRef(false);

  useEffect(() => setEditing(false), [game.id]);

  const start = (): void => {
    cancelled.current = false;
    setDraft(game.name);
    setEditing(true);
  };
  const commit = (): void => {
    setEditing(false);
    if (cancelled.current) return;
    const name = draft.trim();
    if (name === game.name) return;
    const original = game.originalName ?? game.name;
    onRename(game, !name || name === original ? null : name);
  };

  return (
    <div className="name-editor">
      {editing ? (
        <input
          className="name-input"
          aria-label="Nom du jeu"
          autoFocus
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelled.current = true;
              e.currentTarget.blur();
            }
          }}
        />
      ) : (
        <h3>
          <button className="name-btn" onClick={start} title="Renommer le jeu">
            {game.name}
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M11.5 1.5l3 3-9 9H2.5v-3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </h3>
      )}
      {game.originalName && (
        <p className="muted">
          Nom d'origine : {game.originalName} ·{" "}
          <button className="link" onClick={() => onRename(game, null)}>
            Rétablir
          </button>
        </p>
      )}
    </div>
  );
}

export function LibraryView(p: Props): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return p.games.filter(
      (g) =>
        matches(filter, g, p.stats[g.id]) &&
        (!q ||
          g.name.toLowerCase().includes(q) ||
          !!g.originalName?.toLowerCase().includes(q)),
    );
  }, [p.games, p.stats, filter, query]);

  const recent = useMemo(
    () =>
      p.games
        .filter((g) => p.stats[g.id]?.lastPlayed)
        .sort(
          (a, b) =>
            (p.stats[b.id]!.lastPlayed ?? 0) - (p.stats[a.id]!.lastPlayed ?? 0),
        )
        .slice(0, 8),
    [p.games, p.stats],
  );

  const sel = p.selected;
  // Version choisie dans la fiche pour un fangame qui en a plusieurs (la plus récente par défaut)
  const [picked, setPicked] = useState<Record<string, string>>({});
  const target =
    (sel && sel.versions?.find((v) => v.id === picked[sel.id])) ?? sel;
  const selStats = sel ? p.stats[sel.id] : undefined;

  const gridProps = {
    stats: p.stats,
    selectedId: sel?.id,
    onSelect: p.onSelect,
    onLaunch: p.onLaunch,
  };

  const onSearchKey = (e: React.KeyboardEvent): void => {
    // En vue par sections, le premier jeu affiché est celui de la première section non vide
    const first =
      filter === "all"
        ? SECTIONS.flatMap((sec) =>
            visible.filter((g) => matches(sec.filter, g, p.stats[g.id])),
          )[0]
        : visible[0];
    if (e.key === "Enter" && first) p.onLaunch(first);
    if (e.key === "Escape") setQuery("");
  };

  return (
    <div className="lib">
      <aside className="lib-side">
        <span className="brand" onClick={() => setFilter("all")}>
          <span className="dot" aria-hidden="true" />
          Offli-Launcher
        </span>
        <label
          className="searchbar"
          title="Ctrl+K pour chercher, Entrée lance le premier jeu, Échap vide la recherche"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l4 4" />
          </svg>
          <input
            id="lib-search"
            ref={search}
            type="search"
            aria-label="Rechercher un jeu"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
        </label>
        <nav className="side-filters" aria-label="Filtres">
          {FILTERS.map((f) => (
            <div key={f.id} className="side-item">
              {f.group && <h4>{f.group}</h4>}
              <button
                className={filter === f.id ? "on" : ""}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
              >
                <span>{f.label}</span>
                <span className="count">
                  {
                    p.games.filter((g) => matches(f.id, g, p.stats[g.id]))
                      .length
                  }
                </span>
              </button>
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <button
            className="settings-btn"
            onClick={p.onOpenSettings}
            aria-label="Paramètres"
            title="Paramètres"
          >
            {/* Engrenage (forme de l'icône « settings » de Lucide, licence ISC) */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="lib-main">
        {recent.length > 0 && !query && filter === "all" && (
          <section className="stack-s">
            <h5>Récemment joués</h5>
            <div className="recent">
              {recent.map((g) => (
                <button
                  key={g.id}
                  className={`card ${g.id === sel?.id ? "sel" : ""}`}
                  onClick={() => p.onSelect(g.id)}
                  onDoubleClick={() => p.onLaunch(g)}
                  title={g.name}
                >
                  <Cover game={g} />
                </button>
              ))}
            </div>
          </section>
        )}
        {visible.length === 0 ? (
          <section className="stack-s">
            <h5>{FILTERS.find((f) => f.id === filter)!.label} · 0</h5>
            <p className="muted">
              {p.games.length === 0
                ? p.scanning
                  ? "Scan du dossier en cours…"
                  : "Aucun jeu trouvé dans ce dossier. Vérifie le chemin dans les paramètres."
                : "Aucun jeu ne correspond."}
            </p>
          </section>
        ) : filter === "all" ? (
          SECTIONS.map((sec) => {
            const games = visible.filter((g) =>
              matches(sec.filter, g, p.stats[g.id]),
            );
            if (games.length === 0) return null;
            return (
              <section key={sec.filter} className="stack-s">
                <h5>
                  <button
                    className="section-link"
                    onClick={() => setFilter(sec.filter)}
                    title={`Afficher seulement : ${sec.label}`}
                  >
                    {sec.label}
                  </button>{" "}
                  · {games.length}
                </h5>
                <GameGrid {...gridProps} games={games} />
              </section>
            );
          })
        ) : (
          <section className="stack-s">
            <h5>
              {FILTERS.find((f) => f.id === filter)!.label} · {visible.length}
            </h5>
            <GameGrid {...gridProps} games={visible} />
          </section>
        )}
      </main>

      <aside className="lib-detail">
        {sel && (
          <>
            <Cover game={sel} wide />
            <NameEditor game={sel} onRename={p.onRename} />
            <button className="play" onClick={() => p.onLaunch(target!)}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M3 1.5v13l11-6.5z" fill="currentColor" />
              </svg>
              JOUER
            </button>
            <dl className="facts">
              {sel.versions && (
                <>
                  <dt>
                    <label htmlFor="version-select">Version</label>
                  </dt>
                  <dd>
                    <select
                      id="version-select"
                      className="version-select"
                      value={target!.id}
                      onChange={(e) =>
                        setPicked({ ...picked, [sel.id]: e.target.value })
                      }
                    >
                      {sel.versions.map((v, i) => (
                        <option key={v.id} value={v.id}>
                          {v.variant}
                          {i === 0 ? " (la plus récente)" : ""}
                        </option>
                      ))}
                    </select>
                  </dd>
                </>
              )}
              <dt>Type</dt>
              <dd>
                {kindLabel(sel)} · {PLATFORM_LABEL[sel.platform]}
              </dd>
              {sel.kind !== "fangame" && (
                <>
                  <dt>Base</dt>
                  <dd>
                    {sel.baseRom
                      ? `${sel.baseRom.name} (${sel.baseRom.code})`
                      : "Non reconnue"}
                  </dd>
                </>
              )}
              <dt>Fichier</dt>
              <dd>{target!.path}</dd>
              <dt>Dernière session</dt>
              <dd>{lastPlayed(selStats?.lastPlayed)}</dd>
              <dt>Temps de jeu</dt>
              <dd>{playtime(selStats?.playtimeSec ?? 0)}</dd>
            </dl>
            <div className="row-actions">
              <button className="ghost" onClick={() => p.onFavorite(sel)}>
                {selStats?.favorite ? "★ Favori" : "☆ Ajouter aux favoris"}
              </button>
              <button
                className="ghost"
                onClick={() => window.offli.openFolder(target!.id)}
              >
                Ouvrir le dossier
              </button>
              <button
                className="ghost"
                onClick={async () => {
                  const img = await window.offli.pickFile("image");
                  if (img) {
                    await window.offli.setCover(sel.id, img);
                    p.onCoverChanged(sel.id);
                  }
                }}
              >
                Changer l'image
              </button>
              {p.customCovers[sel.id] && (
                <button
                  className="ghost"
                  onClick={async () => {
                    await window.offli.setCover(sel.id, null);
                    p.onCoverChanged(sel.id);
                  }}
                >
                  Réinitialiser l'image
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
