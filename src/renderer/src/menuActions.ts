/** Action de menu, sans dépendance à React (testable côté Node) ; compatible avec MenuAction */
export interface ActionSpec<I> {
  label: string;
  icon: I;
  run(): void;
  disabled?: boolean;
  hint?: string;
}

/**
 * Entrée « Choisir sur SteamGridDB… » du menu de la fiche : toujours présente,
 * désactivée (avec une aide) tant qu'aucune clé API n'est enregistrée.
 */
export function steamGridDbAction<I>(hasKey: boolean, icon: I, open: () => void): ActionSpec<I> {
  return hasKey
    ? { label: "Choisir sur SteamGridDB…", icon, run: open }
    : {
        label: "Choisir sur SteamGridDB…",
        icon,
        disabled: true,
        hint: "Ajoute une clé API dans Paramètres > Images",
        run: () => undefined,
      };
}
