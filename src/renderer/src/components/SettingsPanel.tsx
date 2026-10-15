import { useRef, useState } from "react";
import type { EmulatorPlatform, Settings } from "../../../shared/types";
import { THEMES } from "../theme";

const EMULATORS: { id: EmulatorPlatform; label: string; hint: string }[] = [
  { id: "gba", label: "Game Boy Advance", hint: "mGBA conseillé" },
  { id: "gb", label: "Game Boy", hint: "mGBA ou SameBoy" },
  { id: "gbc", label: "Game Boy Color", hint: "mGBA ou SameBoy" },
  { id: "nds", label: "Nintendo DS", hint: "melonDS conseillé" },
  { id: "3ds", label: "Nintendo 3DS", hint: "Azahar" },
];

const TABS = [
  { id: "library", label: "Bibliothèque" },
  { id: "display", label: "Affichage" },
  { id: "emulators", label: "Émulateurs" },
  { id: "images", label: "Images" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Dernier onglet ouvert, retenu pendant la session */
let lastTab: Tab = "library";

interface Props {
  settings: Settings;
  onSave(patch: Partial<Settings>): Promise<void>;
  scanning: boolean;
  onScan(): void;
  onClose(): void;
}

const Cross = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Interrupteur accessible (role="switch") */
function Switch({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange(on: boolean): void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="switch-row">
      <span id={`${id}-label`} className="switch-label">
        {children}
      </span>
      <button
        id={id}
        className={`switch ${checked ? "on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onSave,
  scanning,
  onScan,
  onClose,
}: Props): React.JSX.Element {
  const [tab, setTabState] = useState<Tab>(lastTab);
  const [key, setKey] = useState("");
  const [wine, setWine] = useState(settings.winePath);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    library: null,
    display: null,
    emulators: null,
    images: null,
  });

  const setTab = (t: Tab, focus = false): void => {
    lastTab = t;
    setTabState(t);
    if (focus) tabRefs.current[t]?.focus();
  };

  // Flèches gauche/droite, Début/Fin entre les onglets
  const onTabKey = (e: React.KeyboardEvent): void => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i + TABS.length - 1) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id, true);
  };

  const setEmulator = (id: EmulatorPlatform, path: string): Promise<void> =>
    onSave({ emulators: { ...settings.emulators, [id]: { path } } });

  return (
    <div
      className="modal-back"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="modal settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id="settings-title">Paramètres</h2>
          <button className="round-close" onClick={onClose} aria-label="Fermer" title="Fermer">
            <Cross />
          </button>
        </header>

        <div className="tabs" role="tablist" aria-label="Sections des paramètres" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`tab ${tab === t.id ? "on" : ""}`}
              onClick={() => setTab(t.id)}
              autoFocus={tab === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {tab === "library" && (
            <section>
              <ul className="folders" aria-label="Dossiers des jeux">
                {settings.libraryPaths.map((dir) => (
                  <li key={dir}>
                    <span className="folder-path" title={dir}>
                      {dir}
                    </span>
                    <button
                      className="icon-btn"
                      aria-label={`Retirer ${dir}`}
                      title="Retirer"
                      onClick={() =>
                        onSave({ libraryPaths: settings.libraryPaths.filter((d) => d !== dir) })
                      }
                    >
                      <Cross />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="row-actions">
                <button
                  className="ghost"
                  onClick={async () => {
                    const dir = await window.offli.pickFolder();
                    if (dir && !settings.libraryPaths.includes(dir))
                      await onSave({ libraryPaths: [...settings.libraryPaths, dir] });
                  }}
                >
                  + Ajouter un dossier
                </button>
                <button
                  className="ghost"
                  onClick={onScan}
                  disabled={scanning || !settings.libraryPaths.length}
                  title={settings.libraryPaths.join("\n")}
                >
                  {scanning ? "Scan…" : "Scanner"}
                </button>
              </div>
            </section>
          )}

          {tab === "display" && (
            <section>
              <h4 id="theme-label">Thème</h4>
              <div className="theme-cards" role="group" aria-labelledby="theme-label">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${settings.theme === t.id ? "on" : ""}`}
                    aria-pressed={settings.theme === t.id}
                    onClick={() => onSave({ theme: t.id })}
                  >
                    <span className="swatches" aria-hidden="true">
                      {t.swatches.map((c) => (
                        <span key={c} className="swatch" style={{ background: c }} />
                      ))}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>

              <h4 id="start-label">Ouvrir au démarrage</h4>
              <div className="segmented" role="radiogroup" aria-labelledby="start-label">
                {(
                  [
                    ["library", "Bibliothèque"],
                    ["bigpicture", "Big Picture"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={settings.startView === v}
                    tabIndex={settings.startView === v ? 0 : -1}
                    className={settings.startView === v ? "on" : ""}
                    onClick={() => onSave({ startView: v })}
                    onKeyDown={(e) => {
                      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                        e.preventDefault();
                        e.stopPropagation();
                        const other = v === "library" ? "bigpicture" : "library";
                        void onSave({ startView: other });
                        (e.currentTarget.parentElement?.querySelector(
                          `[data-v="${other}"]`,
                        ) as HTMLElement | null)?.focus();
                      }
                    }}
                    data-v={v}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Switch
                id="set-bp-fullscreen"
                checked={settings.bigPictureFullscreen}
                onChange={(on) => onSave({ bigPictureFullscreen: on })}
              >
                Plein écran en Big Picture
              </Switch>
            </section>
          )}

          {tab === "emulators" && (
            <section>
              <p className="muted">Vide = application par défaut</p>
              <ul className="emu-list">
                {EMULATORS.map((e) => (
                  <li key={e.id} className="emu-row">
                    <label htmlFor={`emu-${e.id}`} className="emu-name">
                      {e.label}
                      <span className="muted">{e.hint}</span>
                    </label>
                    <input
                      id={`emu-${e.id}`}
                      readOnly
                      value={settings.emulators[e.id].path}
                      placeholder="Application par défaut"
                    />
                    <button
                      className="icon-btn"
                      aria-label={`Parcourir pour ${e.label}`}
                      title="Parcourir"
                      onClick={async () => {
                        const path = await window.offli.pickFile("executable");
                        if (path) await setEmulator(e.id, path);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                    </button>
                    <button
                      className="icon-btn"
                      aria-label={`Utiliser l'application par défaut pour ${e.label}`}
                      title="Application par défaut"
                      disabled={!settings.emulators[e.id].path}
                      onClick={() => setEmulator(e.id, "")}
                    >
                      <Cross />
                    </button>
                  </li>
                ))}
                <li className="emu-row">
                  <label htmlFor="set-wine" className="emu-name">
                    Wine
                    <span className="muted">Linux et macOS, pour les Game.exe</span>
                  </label>
                  <input
                    id="set-wine"
                    value={wine}
                    onChange={(e) => setWine(e.target.value)}
                    onBlur={() => onSave({ winePath: wine })}
                  />
                </li>
              </ul>
            </section>
          )}

          {tab === "images" && (
            <section>
              <Switch
                id="set-base"
                checked={settings.useBaseRomCovers}
                onChange={(on) => onSave({ useBaseRomCovers: on })}
              >
                Romhacks : jaquette du jeu de base (libretro-thumbnails)
              </Switch>
              <Switch
                id="set-sgdb"
                checked={settings.useSteamGridDb}
                onChange={(on) => onSave({ useSteamGridDb: on })}
              >
                Chercher les images sur SteamGridDB
              </Switch>
              {settings.useSteamGridDb && (
                <div className="field">
                  <label htmlFor="set-sgdb-key">Clé API SteamGridDB</label>
                  {/* La clé enregistrée n'est jamais renvoyée au rendu : le champ sert seulement à la remplacer */}
                  <div className="field-row">
                    <input
                      id="set-sgdb-key"
                      type="password"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      onBlur={() => {
                        if (key.trim()) {
                          void onSave({ steamGridDbKey: key.trim() });
                          setKey("");
                        }
                      }}
                      placeholder={
                        settings.hasSteamGridDbKey
                          ? "Clé enregistrée (saisir pour la remplacer)"
                          : "Profil SteamGridDB > Préférences > API"
                      }
                    />
                    {settings.hasSteamGridDbKey && (
                      <button className="ghost" onClick={() => onSave({ steamGridDbKey: "" })}>
                        Supprimer la clé
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
