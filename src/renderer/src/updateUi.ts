import type { UpdateStatus } from "../../shared/types";

/** Ce que fait un clic sur le bouton de mise à jour */
export type UpdateAction = "check" | "download" | "open-page" | "confirm-install" | "none";

export interface UpdateView {
  /** Libellé accessible (aria-label), annoncé aussi aux lecteurs d'écran */
  label: string;
  tooltip: string;
  /** Pastille sur l'icône : accent (version disponible) ou vert Jouer (prête à installer) */
  badge: "accent" | "play" | null;
  /** Indicateur de chargement (vérification) ou anneau de progression (téléchargement) */
  busy: boolean;
  percent?: number;
  action: UpdateAction;
  disabled: boolean;
  /** Message court affiché sous le bouton (erreur) */
  message?: string;
}

/** Correspondance état des mises à jour → bouton de la barre latérale */
export function updateView(status: UpdateStatus, version: string): UpdateView {
  const base = { badge: null, busy: false, disabled: false } as const;
  switch (status.state) {
    case "idle":
      return { ...base, label: "Vérifier les mises à jour", tooltip: "Vérifier les mises à jour", action: "check" };
    case "checking":
      return { ...base, label: "Recherche de mises à jour…", tooltip: "Recherche de mises à jour…", busy: true, action: "none", disabled: true };
    case "not-available":
      return { ...base, label: `Offli-Launcher est à jour (v${version})`, tooltip: `Offli-Launcher est à jour (v${version})`, action: "check" };
    case "available":
      return {
        ...base,
        label: `Version ${status.version} disponible : télécharger`,
        tooltip: `Version ${status.version} disponible`,
        badge: "accent",
        action: "download",
      };
    case "downloading":
      return {
        ...base,
        label: `Téléchargement de la mise à jour : ${status.percent} %`,
        tooltip: `Téléchargement de la mise à jour : ${status.percent} %`,
        busy: true,
        percent: status.percent,
        action: "none",
        disabled: true,
      };
    case "downloaded":
      return {
        ...base,
        label: `Version ${status.version} prête : redémarrer pour l'installer`,
        tooltip: `Version ${status.version} prête à installer`,
        badge: "play",
        action: "confirm-install",
      };
    case "error":
      return {
        ...base,
        label: `${status.message}. Réessayer la vérification`,
        tooltip: `${status.message} : cliquer pour réessayer`,
        action: "check",
        message: status.message,
      };
    case "unsupported":
      if (status.reason === "dev")
        return { ...base, label: "Mises à jour indisponibles en développement", tooltip: "Mises à jour indisponibles en développement", action: "none", disabled: true };
      if (status.version)
        return {
          ...base,
          label: `Version ${status.version} disponible : ouvrir la page de téléchargement`,
          tooltip: `Version ${status.version} disponible : à télécharger sur GitHub`,
          badge: "accent",
          action: "open-page",
        };
      return {
        ...base,
        label: "Ouvrir la page des versions",
        tooltip: "Mise à jour automatique indisponible ici : ouvrir la page des versions",
        action: "open-page",
      };
  }
}
