/**
 * Tutoriel du premier lancement : description des six étapes et navigation,
 * sans dépendance à React (testable côté Node).
 */

export type TourStepId = "welcome" | "folders" | "sidebar" | "detail" | "settings" | "bigpicture";

export interface TourStep {
  id: TourStepId;
  /** Fenêtre centrée, ou bulle à côté d'un élément mis en lumière (attribut data-tour) */
  kind: "modal" | "spotlight";
  target?: string;
  /** Côté de la bulle par rapport à l'élément mis en lumière */
  side?: "right" | "left" | "top";
  title: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", kind: "modal", title: "Bienvenue sur Offli-Launcher" },
  { id: "folders", kind: "modal", title: "Où sont tes jeux ?" },
  { id: "sidebar", kind: "spotlight", target: "sidebar", side: "right", title: "Tes jeux sont déjà rangés" },
  { id: "detail", kind: "spotlight", target: "detail-actions", side: "left", title: "Clique sur un jeu, puis Jouer" },
  { id: "settings", kind: "spotlight", target: "settings", side: "right", title: "Fais-le à ton goût" },
  { id: "bigpicture", kind: "modal", title: "Joue depuis ton canapé" },
];

export type TourAction = "next" | "back" | "skip";

/** Résultat d'une action : nouvelle étape, ou fin du tutoriel (terminé ou passé) */
export type TourResult = { step: number } | { done: "finished" | "skipped" };

export function tourReduce(step: number, action: TourAction, count = TOUR_STEPS.length): TourResult {
  if (action === "skip") return { done: "skipped" };
  if (action === "back") return { step: Math.max(0, step - 1) };
  return step >= count - 1 ? { done: "finished" } : { step: step + 1 };
}

/** Le tutoriel s'ouvre tout seul au premier lancement, une fois un dossier de jeux choisi */
export function shouldAutoStartTour(settings: { tutorialDone: boolean; libraryPaths: string[] }): boolean {
  return !settings.tutorialDone && settings.libraryPaths.length > 0;
}

/** Ligne d'état de l'étape « Où sont tes jeux ? » */
export function libraryStatus(games: { kind: string }[]): string {
  const fangames = games.filter((g) => g.kind === "fangame").length;
  const roms = games.length - fangames;
  const plural = (n: number, one: string, many: string): string => `${n} ${n > 1 ? many : one}`;
  return `${plural(games.length, "jeu trouvé", "jeux trouvés")} · ${plural(fangames, "fangame", "fangames")}, ${plural(roms, "ROM", "ROMs")}`;
}
