import { useState } from "react";
import type { EmulatorPlatform, Settings } from "../../../shared/types";

const EMULATORS: { id: EmulatorPlatform; label: string; hint: string }[] = [
  { id: "gba", label: "Game Boy Advance", hint: "mGBA conseillé" },
  { id: "gb", label: "Game Boy", hint: "mGBA ou SameBoy" },
  { id: "gbc", label: "Game Boy Color", hint: "mGBA ou SameBoy" },
  { id: "nds", label: "Nintendo DS", hint: "melonDS conseillé" },
  { id: "3ds", label: "Nintendo 3DS", hint: "Azahar" },
];

interface Props {
  settings: Settings;
  onSave(patch: Partial<Settings>): Promise<void>;
  onClose(): void;
}

export function SettingsPanel({
  settings,
  onSave,
  onClose,
}: Props): React.JSX.Element {
  const [key, setKey] = useState(settings.steamGridDbKey);
  const [wine, setWine] = useState(settings.winePath);

  const setEmulator = (
    id: EmulatorPlatform,
    patch: Partial<Settings["emulators"][EmulatorPlatform]>,
  ): Promise<void> =>
    onSave({
      emulators: {
        ...settings.emulators,
        [id]: { ...settings.emulators[id], ...patch },
      },
    });

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Paramètres"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>Paramètres</h2>
          <button className="ghost" onClick={onClose}>
            Fermer
          </button>
        </header>

        <section>
          <h4>Bibliothèque</h4>
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
                    onSave({
                      libraryPaths: settings.libraryPaths.filter((d) => d !== dir),
                    })
                  }
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="ghost add-folder"
            onClick={async () => {
              const dir = await window.offli.pickFolder();
              if (dir && !settings.libraryPaths.includes(dir))
                await onSave({ libraryPaths: [...settings.libraryPaths, dir] });
            }}
          >
            + Ajouter un dossier
          </button>
        </section>

        <section>
          <h4>Émulateurs</h4>
          <p className="muted">
            Les arguments acceptent <code>{"{rom}"}</code>, remplacé par le
            chemin de la ROM. Exemple pour mGBA en plein écran :{" "}
            <code>-f {"{rom}"}</code>
          </p>
          {EMULATORS.map((e) => (
            <div className="field" key={e.id}>
              <label htmlFor={`emu-${e.id}`}>
                {e.label} <span className="muted">· {e.hint}</span>
              </label>
              <div className="field-row">
                <input
                  id={`emu-${e.id}`}
                  readOnly
                  value={settings.emulators[e.id].path}
                  placeholder="Non configuré"
                />
                <input
                  id={`emu-${e.id}-args`}
                  className="args"
                  defaultValue={settings.emulators[e.id].args.join(" ")}
                  onBlur={(ev) =>
                    setEmulator(e.id, {
                      args: ev.target.value.split(" ").filter(Boolean),
                    })
                  }
                  aria-label={`Arguments ${e.label}`}
                />
                <button
                  className="ghost"
                  onClick={async () => {
                    const path = await window.offli.pickFile("executable");
                    if (path) await setEmulator(e.id, { path });
                  }}
                >
                  Parcourir
                </button>
              </div>
            </div>
          ))}
          <div className="field">
            <label htmlFor="set-wine">
              Wine (Linux et macOS){" "}
              <span className="muted">· pour lancer les Game.exe</span>
            </label>
            <input
              id="set-wine"
              value={wine}
              onChange={(e) => setWine(e.target.value)}
              onBlur={() => onSave({ winePath: wine })}
            />
          </div>
        </section>

        <section>
          <h4>Images</h4>
          <label className="check">
            <input
              id="set-base"
              type="checkbox"
              checked={settings.useBaseRomCovers}
              onChange={(e) => onSave({ useBaseRomCovers: e.target.checked })}
            />
            Pour les romhacks, utiliser la jaquette du jeu de base (téléchargée
            une fois depuis libretro-thumbnails)
          </label>
          <label className="check">
            <input
              id="set-sgdb"
              type="checkbox"
              checked={settings.useSteamGridDb}
              onChange={(e) => onSave({ useSteamGridDb: e.target.checked })}
            />
            Chercher les images sur SteamGridDB
          </label>
          {settings.useSteamGridDb && (
            <div className="field">
              <label htmlFor="set-sgdb-key">Clé API SteamGridDB</label>
              <input
                id="set-sgdb-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onBlur={() => onSave({ steamGridDbKey: key.trim() })}
                placeholder="Profil SteamGridDB > Préférences > API"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
