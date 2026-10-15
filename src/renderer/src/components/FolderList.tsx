import { addFolder, addFolderLabel, folderStatus, removeFolder } from "../folders";

interface Props {
  paths: string[];
  /** Nouvelle liste de dossiers (l'appelant l'enregistre, ce qui relance le scan) */
  onChange(paths: string[]): unknown;
  /** Jeux trouvés et état du scan, pour la ligne d'état */
  games: { kind: string }[];
  scanning: boolean;
}

/**
 * Liste des dossiers de jeux, partagée par le tutoriel, les paramètres et l'écran du
 * premier lancement : une ligne par dossier (icône, chemin, croix pour le retirer),
 * un bouton d'ajout en pointillés (vrai sélecteur de dossier) et la ligne d'état du scan.
 */
export function FolderList({ paths, onChange, games, scanning }: Props): React.JSX.Element {
  return (
    <div className="folder-picker">
      {paths.length > 0 && (
        <ul className="folder-list" aria-label="Dossiers de jeux">
          {paths.map((dir) => (
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
                onClick={() => onChange(removeFolder(paths, dir))}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="folder-add"
        onClick={async () => {
          const next = addFolder(paths, await window.offli.pickFolder());
          if (next !== paths) await onChange(next);
        }}
      >
        {addFolderLabel(paths)}
      </button>
      <p className="folder-status" role="status">
        {folderStatus(paths, games, scanning)}
      </p>
    </div>
  );
}
