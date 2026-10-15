import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, GameStats } from "../../../shared/types";
import type { ViewProps } from "../App";
import { Cover } from "../components/Cover";
import logo from "../assets/logo.png";
import { GameActions } from "../components/GameActions";
import { SgdbPicker } from "../components/SgdbPicker";
import { UpdateButton } from "../components/UpdateButton";
import { steamGridDbAction } from "../menuActions";
import { animate } from "../viewTransition";

/** Attente avant d'animer la recherche : les frappes rapprochées donnent une seule animation */
const SEARCH_SETTLE_MS = 120;
import { PLATFORM_LABEL, kindLabel, lastPlayed, playtime } from "../format";

/**
 * Chemin du fichier masqué par défaut : tant qu'il n'est pas révélé, il n'est ni dans
 * le DOM ni dans une infobulle. Remonté à chaque jeu (key), il se re-masque au changement
 * de jeu et à la fermeture de la fiche.
 */
function PathSpoiler({ path }: { path: string }): React.JSX.Element {
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <button
        className="spoiler"
        onClick={() => setShown(true)}
        aria-label="Afficher le chemin du fichier"
        aria-expanded={false}
      >
        <span className="spoiler-blur" aria-hidden="true">
          ████████ ██████ ███████████
        </span>
        <span className="spoiler-hint" aria-hidden="true">
          Afficher
        </span>
      </button>
    );
  }
  return (
    <span className="spoiler-shown">
      {path}{" "}
      <button
        className="link"
        onClick={() => setShown(false)}
        aria-label="Masquer le chemin du fichier"
        aria-expanded={true}
      >
        Masquer
      </button>
    </span>
  );
}

/** Icônes du menu « Plus d'actions » (trait currentColor, masquées aux lecteurs d'écran) */
const icon = (d: string): React.JSX.Element => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  folder: icon("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
  image: icon("M4 5h16v14H4zM4 15l4.5-4.5 4 4L15 12l5 5M15.5 9.5h.01"),
  grid: icon("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
  reset: icon("M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"),
  // Œil barré
  hide: icon("M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 4.5 10 6a17 17 0 0 1-3.3 3.8M6.6 6.6A17 17 0 0 0 2 12c1 1.5 5 6 10 6a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"),
};

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
  onBigPicture(): void;
  /** Images choisies par l'utilisateur, par id de jeu */
  customCovers: Record<string, string>;
  /** Une clé SteamGridDB est enregistrée : le menu propose de choisir une jaquette */
  hasSgdbKey: boolean;
  onCoverChanged(id: string): void;
  onRename(game: Game, name: string | null): void;
  /** Masque le jeu partout (ferme la fiche s'il était sélectionné) */
  onHide(game: Game): void;
}

/** Au-delà, les cartes ne sont pas animées une à une (fluidité des grandes bibliothèques) */
const MAX_ANIMATED_CARDS = 120;

interface GridProps {
  games: Game[];
  /** Préfixe des noms de transition : un même jeu peut apparaître dans deux sections */
  section: string;
  /** Les cartes portent un nom de transition et glissent vers leur nouvelle place */
  animated: boolean;
  stats: Record<string, GameStats>;
  selectedId: string | undefined;
  onSelect(id: string | undefined): void;
  onLaunch(game: Game): void;
}

/**
 * Clic sur une carte : sélectionne le jeu, ou le désélectionne s'il l'était déjà.
 * Double-clic : lance le jeu en le laissant sélectionné (le second clic du double-clic est ignoré).
 */
function cardActions(
  g: Game,
  p: Pick<GridProps, "selectedId" | "onSelect" | "onLaunch">,
): Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onDoubleClick"> {
  return {
    onClick: (e) => {
      if (e.detail <= 1) p.onSelect(g.id === p.selectedId ? undefined : g.id);
    },
    onDoubleClick: () => {
      p.onSelect(g.id);
      p.onLaunch(g);
    },
  };
}

function GameGrid(p: GridProps): React.JSX.Element {
  return (
    <div className="grid">
      {p.games.map((g) => (
        <button
          key={g.id}
          className={`card ${g.id === p.selectedId ? "sel" : ""}`}
          data-game={g.id}
          style={
            p.animated
              ? ({ viewTransitionName: `card-${p.section}-${g.id}` } as React.CSSProperties)
              : undefined
          }
          {...cardActions(g, p)}
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
  // Recherche appliquée à la grille, mise à jour une fois la frappe posée (animation groupée)
  const [appliedQuery, setAppliedQuery] = useState("");
  const changeFilter = (f: Filter): void => animate(() => setFilter(f));

  useEffect(() => {
    if (query === appliedQuery) return;
    const t = window.setTimeout(() => animate(() => setAppliedQuery(query)), SEARCH_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [query, appliedQuery]);
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
    const q = appliedQuery.trim().toLowerCase();
    return p.games.filter(
      (g) =>
        matches(filter, g, p.stats[g.id]) &&
        (!q ||
          g.name.toLowerCase().includes(q) ||
          !!g.originalName?.toLowerCase().includes(q)),
    );
  }, [p.games, p.stats, filter, appliedQuery]);

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
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [sgdbFor, setSgdbFor] = useState<Game>();
  const target =
    (sel && sel.versions?.find((v) => v.id === picked[sel.id])) ?? sel;
  const selStats = sel ? p.stats[sel.id] : undefined;

  const gridProps = {
    animated: visible.length <= MAX_ANIMATED_CARDS,
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
    // Entrée juste après une frappe : on lance le premier jeu de la recherche tapée, sans attendre
    if (e.key === "Enter" && query !== appliedQuery) {
      const q = query.trim().toLowerCase();
      const hit = p.games.find(
        (g) =>
          matches(filter, g, p.stats[g.id]) &&
          (!q || g.name.toLowerCase().includes(q) || !!g.originalName?.toLowerCase().includes(q)),
      );
      setAppliedQuery(query);
      if (hit) p.onLaunch(hit);
      return;
    }
    if (e.key === "Enter" && first) p.onLaunch(first);
    if (e.key === "Escape") setQuery("");
  };

  return (
    <div className={`lib ${sel ? "" : "no-detail"}`}>
      <aside className="lib-side">
        <span className="brand" onClick={() => changeFilter("all")}>
          <img className="brand-logo" src={logo} alt="" aria-hidden="true" draggable={false} />
          Offli-Launcher
        </span>
        <label
          className="searchbar"
          data-tour="sidebar"
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
        <nav className="side-filters" aria-label="Filtres" data-tour="sidebar">
          {FILTERS.map((f) => (
            <div key={f.id} className="side-item">
              {f.group && <h4>{f.group}</h4>}
              <button
                className={filter === f.id ? "on" : ""}
                onClick={() => changeFilter(f.id)}
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
            className="icon-square"
            onClick={p.onBigPicture}
            aria-label="Big Picture (F11)"
            title="Big Picture (F11)"
          >
            {/* Écran et manette */}
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
              <rect x="2" y="3" width="20" height="13" rx="2" />
              <path d="M8 21h8M12 16v5" />
            </svg>
          </button>
          <UpdateButton />
          <button
            className="settings-btn"
            data-tour="settings"
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
                  {...cardActions(g, gridProps)}
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
                    onClick={() => changeFilter(sec.filter)}
                    title={`Afficher seulement : ${sec.label}`}
                  >
                    {sec.label}
                  </button>{" "}
                  · {games.length}
                </h5>
                <GameGrid {...gridProps} section={sec.filter} games={games} />
              </section>
            );
          })
        ) : (
          <section className="stack-s">
            <h5>
              {FILTERS.find((f) => f.id === filter)!.label} · {visible.length}
            </h5>
            <GameGrid {...gridProps} section={filter} games={visible} />
          </section>
        )}
      </main>

      {sel && (
        <aside className="lib-detail" aria-label={`Fiche de ${sel.name}`}>
          <>
            <button
              className="close-detail"
              onClick={() => p.onSelect(undefined)}
              aria-label="Fermer la fiche"
              title="Fermer la fiche"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <Cover game={sel} wide />
            <NameEditor game={sel} onRename={p.onRename} />
            <div className="play-row" data-tour="detail-actions">
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
              <GameActions
                gameId={sel.id}
                favorite={!!selStats?.favorite}
                onFavorite={() => p.onFavorite(sel)}
                actions={[
                  {
                    label: "Ouvrir le dossier",
                    icon: ICONS.folder,
                    run: () => window.offli.openFolder(target!.id),
                  },
                  {
                    label: "Changer l'image",
                    icon: ICONS.image,
                    run: async () => {
                      const img = await window.offli.pickFile("image");
                      if (img) {
                        await window.offli.setCover(sel.id, img);
                        p.onCoverChanged(sel.id);
                      }
                    },
                  },
                  steamGridDbAction(p.hasSgdbKey, ICONS.grid, () => setSgdbFor(sel)),
                  ...(p.customCovers[sel.id]
                    ? [
                        {
                          label: "Réinitialiser l'image",
                          icon: ICONS.reset,
                          run: async () => {
                            await window.offli.setCover(sel.id, null);
                            p.onCoverChanged(sel.id);
                          },
                        },
                      ]
                    : []),
                  { label: "Masquer ce jeu", icon: ICONS.hide, run: () => p.onHide(sel) },
                ]}
              />
            </div>
            <dl className="facts" data-tour="detail-actions">
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
              <dt>Dernière session</dt>
              <dd>{lastPlayed(selStats?.lastPlayed)}</dd>
              <dt>Temps de jeu</dt>
              <dd>{playtime(selStats?.playtimeSec ?? 0)}</dd>
              {/* En dernier : le chemin révélé peut prendre plusieurs lignes sans rien décaler en dessous */}
              <dt>Fichier</dt>
              <dd>
                <PathSpoiler key={target!.id} path={target!.path} />
              </dd>
            </dl>
          </>
        </aside>
      )}
      {sgdbFor && (
        <SgdbPicker
          game={sgdbFor}
          onClose={() => setSgdbFor(undefined)}
          onPicked={() => p.onCoverChanged(sgdbFor.id)}
        />
      )}
    </div>
  );
}
