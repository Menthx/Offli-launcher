import { useCallback, useEffect, useRef, useState } from "react";
import type { Game, GameStats, Settings } from "../../shared/types";
import { forgetCover } from "./components/Cover";
import { SettingsPanel } from "./components/SettingsPanel";
import { LibraryView } from "./views/LibraryView";

export interface Toast {
  text: string;
  error?: boolean;
}

export interface ViewProps {
  games: Game[];
  stats: Record<string, GameStats>;
  selected: Game | undefined;
  onSelect(id: string): void;
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
  const [toast, setToast] = useState<Toast | null>(null);
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
      setGames(cached);
      setStats(st);
      // L'index en cache s'affiche tout de suite, le scan le rafraîchit ensuite
      if (s.libraryPath) void rescan();
    })();
    return window.offli.onStatsChanged((s) => setStats({ ...s }));
  }, [rescan]);

  const save = async (patch: Partial<Settings>): Promise<void> => {
    const next = await window.offli.saveSettings(patch);
    setSettings(next);
    if (
      "useSteamGridDb" in patch ||
      "steamGridDbKey" in patch ||
      "useBaseRomCovers" in patch
    )
      forgetCover();
    if ("libraryPath" in patch) void rescan();
  };

  const launch = async (game: Game): Promise<void> => {
    notify({ text: `Lancement de ${game.name}…` });
    const r = await window.offli.launch(game.id);
    if (!r.ok)
      notify({ text: r.error ?? "Le lancement a échoué.", error: true });
  };

  const favorite = async (game: Game): Promise<void> => {
    const s = await window.offli.toggleFavorite(game.id);
    setStats((prev) => ({ ...prev, [game.id]: s }));
  };

  if (!settings) return <div className="boot" />;

  const selected = games.find((g) => g.id === selectedId) ?? games[0];
  const props: ViewProps = {
    games,
    stats,
    selected,
    onSelect: setSelectedId,
    onLaunch: launch,
    onFavorite: favorite,
  };

  return (
    <>
      {!settings.libraryPath ? (
        <div className="onboarding">
          <h1>Offli-Launcher</h1>
          <p>
            Choisis le dossier où sont rangés tes fangames et tes romhacks.
            Offli-Launcher le parcourt et les range pour toi.
          </p>
          <button
            className="play"
            onClick={async () => {
              const dir = await window.offli.pickFolder();
              if (dir) await save({ libraryPath: dir });
            }}
          >
            Choisir le dossier
          </button>
        </div>
      ) : (
        <LibraryView
          {...props}
          libraryPath={settings.libraryPath}
          scanning={scanning}
          onRescan={rescan}
          onOpenSettings={() => setShowSettings(true)}
          onCoverChanged={(id) => forgetCover(id)}
        />
      )}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={save}
          onClose={() => setShowSettings(false)}
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
