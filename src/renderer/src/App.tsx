import { useCallback, useEffect, useRef, useState } from "react";
import type { Game, GameStats, Settings, StartView } from "../../shared/types";
import { forgetCover } from "./components/Cover";
import { SettingsPanel } from "./components/SettingsPanel";
import { Tour } from "./components/Tour";
import { hideGame, withoutHidden } from "./hiddenGames";
import { applyTheme } from "./theme";
import { shouldAutoStartTour } from "./tour";
import { animateSelection } from "./viewTransition";
import { BigPictureView } from "./views/BigPictureView";
import { LibraryView } from "./views/LibraryView";

export interface Toast {
  text: string;
  error?: boolean;
}

export interface ViewProps {
  games: Game[];
  stats: Record<string, GameStats>;
  selected: Game | undefined;
  onSelect(id: string | undefined): void;
  onLaunch(game: Game): void;
  onFavorite(game: Game): void;
}

export function App(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<Record<string, GameStats>>({});
  const [selectedId, setSelectedId] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Tutoriel : ouvert seul au premier lancement (une fois par session au plus), ou depuis les paramètres
  const [tourOpen, setTourOpen] = useState(false);
  const tourAutoChecked = useRef(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [view, setView] = useState<StartView>("library");
  const toastTimer = useRef<number>(undefined);

  const notify = useCallback((t: Toast) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      t.error ? 5000 : 2500,
    );
  }, []);

  const rescan = useCallback(async () => {
    setScanning(true);
    try {
      const list = await window.offli.scan();
      forgetCover();
      setGames(list);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [s, cached, st] = await Promise.all([
        window.offli.getSettings(),
        window.offli.getLibrary(),
        window.offli.getStats(),
      ]);
      setSettings(s);
      setView(s.startView);
      setGames(cached);
      setStats(st);
      // L'index en cache s'affiche tout de suite, le scan le rafraîchit ensuite
      if (s.libraryPaths.length) void rescan();
    })();
    return window.offli.onStatsChanged((s) => setStats({ ...s }));
  }, [rescan]);

  // Thème choisi dans les paramètres (Console par défaut)
  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings?.theme]);

  // Big Picture reste dans la fenêtre, sauf si « Plein écran en Big Picture » est coché.
  // Revenir à la bibliothèque sort toujours du plein écran.
  const fullscreen = view === "bigpicture" && !!settings?.bigPictureFullscreen;
  useEffect(() => {
    void window.offli.setFullScreen(fullscreen);
  }, [fullscreen]);

  // F11 (intercepté par le process principal) bascule entre Bibliothèque et Big Picture
  useEffect(
    () =>
      window.offli.onToggleView(() =>
        setView((v) => (v === "bigpicture" ? "library" : "bigpicture")),
      ),
    [],
  );

  const save = async (patch: Partial<Settings>): Promise<void> => {
    const next = await window.offli.saveSettings(patch);
    setSettings(next);
    if (
      "useSteamGridDb" in patch ||
      "steamGridDbKey" in patch ||
      "useBaseRomCovers" in patch
    )
      forgetCover();
    if ("libraryPaths" in patch) void rescan();
  };

  const launch = async (game: Game): Promise<void> => {
    notify({ text: `Lancement de ${game.name}…` });
    const r = await window.offli.launch(game.id);
    if (!r.ok)
      notify({ text: r.error ?? "Le lancement a échoué.", error: true });
  };

  const rename = async (game: Game, name: string | null): Promise<void> => {
    setGames(await window.offli.renameGame(game.id, name));
    if (settings?.useSteamGridDb) forgetCover(game.id);
  };

  // Image changée ou réinitialisée : on relit les réglages (coverOverrides) et on oublie l'ancienne jaquette
  const coverChanged = async (id: string): Promise<void> => {
    forgetCover(id);
    setSettings(await window.offli.getSettings());
  };

  const favorite = async (game: Game): Promise<void> => {
    const s = await window.offli.toggleFavorite(game.id);
    setStats((prev) => ({ ...prev, [game.id]: s }));
  };

  useEffect(() => {
    if (!settings || tourAutoChecked.current || !shouldAutoStartTour(settings)) return;
    tourAutoChecked.current = true;
    setTourOpen(true);
  }, [settings]);

  if (!settings) return <div className="boot" />;

  // Aucun jeu sélectionné par défaut : la fiche n'apparaît qu'après un clic
  // Les jeux masqués disparaissent de toutes les vues (sections, favoris, récents, recherche, Big Picture)
  const shownGames = withoutHidden(games, settings.hiddenGames);
  const selected = shownGames.find((g) => g.id === selectedId);
  const props: ViewProps = {
    games: shownGames,
    stats,
    selected,
    // La jaquette de la carte vole vers la fiche (et revient à la fermeture)
    onSelect: (id) =>
      animateSelection(selected?.id, id, () => setSelectedId(id)),
    onLaunch: launch,
    onFavorite: favorite,
  };

  return (
    <>
      {!settings.libraryPaths.length ? (
        <div className="onboarding">
          <h1>Offli-Launcher</h1>
          <p>Choisis le dossier où sont rangés tes fangames et tes romhacks.</p>
          <p>Offli-Launcher le parcourt et les range pour toi.</p>
          <button
            className="cta"
            onClick={async () => {
              const dir = await window.offli.pickFolder();
              if (dir) await save({ libraryPaths: [dir] });
            }}
          >
            Choisir le dossier
          </button>
        </div>
      ) : view === "bigpicture" ? (
        <BigPictureView {...props} onExit={() => setView("library")} />
      ) : (
        <LibraryView
          {...props}
          scanning={scanning}
          onOpenSettings={() => setShowSettings(true)}
          onBigPicture={() => setView("bigpicture")}
          customCovers={settings.coverOverrides}
          hasSgdbKey={!!settings.hasSteamGridDbKey}
          onCoverChanged={(id) => void coverChanged(id)}
          onRename={rename}
          onHide={(game) => {
            if (selectedId === game.id) setSelectedId(undefined);
            void save({ hiddenGames: hideGame(settings.hiddenGames, game.id) });
          }}
        />
      )}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          games={games}
          onSave={save}
          scanning={scanning}
          onScan={rescan}
          onReplayTour={() => {
            setShowSettings(false);
            setView("library");
            setTourOpen(true);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {tourOpen && settings.libraryPaths.length > 0 && view === "library" && (
        <Tour
          settings={settings}
          games={shownGames}
          scanning={scanning}
          selectedId={selected?.id}
          onSelect={props.onSelect}
          onSave={save}
          onClose={() => {
            setTourOpen(false);
            // Terminé ou passé : le tutoriel ne s'ouvrira plus tout seul
            if (!settings.tutorialDone) void save({ tutorialDone: true });
          }}
        />
      )}
      <div
        className={`toast ${toast ? "show" : ""} ${toast?.error ? "error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast?.text}
      </div>
    </>
  );
}
