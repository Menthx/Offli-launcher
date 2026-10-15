import { libraryStatus } from "./tour";

/**
 * Logique de la liste des dossiers de jeux (composant FolderList), sans dépendance
 * à React : ajout sans doublon, retrait, ligne d'état sous la liste.
 */
export function addFolder(paths: string[], dir: string | null | undefined): string[] {
  if (!dir || paths.includes(dir)) return paths;
  return [...paths, dir];
}

export function removeFolder(paths: string[], dir: string): string[] {
  return paths.filter((d) => d !== dir);
}

/** « N jeux trouvés · X fangames, Y ROMs » (les ROMs de base ne comptent pas), ou l'état en cours */
export function folderStatus(paths: string[], games: { kind: string }[], scanning: boolean): string {
  if (!paths.length) return "Aucun dossier pour l'instant.";
  if (scanning) return "Scan en cours…";
  return libraryStatus(games.filter((g) => g.kind !== "baserom"));
}

/** Libellé du bouton d'ajout : premier dossier ou dossier supplémentaire */
export function addFolderLabel(paths: string[]): string {
  return paths.length ? "+ Ajouter un autre dossier" : "+ Ajouter un dossier";
}
