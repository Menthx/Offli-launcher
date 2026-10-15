import { flushSync } from "react-dom";

/**
 * Animations de la bibliothèque avec la View Transitions API de Chromium.
 * Sans l'API, ou si l'utilisateur préfère réduire les animations, le changement
 * est appliqué tout de suite, sans animation.
 */

type StartViewTransition = (update: () => void) => { finished: Promise<void> };

function startViewTransition(): StartViewTransition | undefined {
  const doc = document as Document & { startViewTransition?: StartViewTransition };
  if (!doc.startViewTransition) return undefined;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
  return doc.startViewTransition.bind(doc);
}

/** Applique un changement d'état React en animant la page entre l'avant et l'après */
export function animate(update: () => void): void {
  const start = startViewTransition();
  if (!start) {
    update();
    return;
  }
  start(() => flushSync(update));
}

const HERO = "hero-cover";

/** Jaquette d'un jeu dans la grille principale (pas dans « Récemment joués ») */
function cardCover(id: string | undefined): HTMLElement | null {
  if (!id) return null;
  return document.querySelector<HTMLElement>(`.lib-main .grid .card[data-game="${CSS.escape(id)}"] .cover`);
}

function detailCover(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".lib-detail .cover");
}

function name(el: HTMLElement | null, value: string): void {
  if (el) el.style.setProperty("view-transition-name", value);
}

/**
 * Sélection d'un jeu : la jaquette de la carte vole vers celle de la fiche (élément partagé),
 * et fait le trajet inverse quand la fiche se ferme. Le nom de transition n'est posé que
 * pendant l'animation, sur un seul élément à la fois de chaque côté.
 */
export function animateSelection(fromId: string | undefined, toId: string | undefined, apply: () => void): void {
  const start = startViewTransition();
  if (!start || fromId === toId) {
    apply();
    return;
  }
  // Avant : la carte cliquée (ouverture, changement de jeu) ou la fiche (fermeture)
  const before = toId ? cardCover(toId) : detailCover();
  name(before, HERO);
  let after: HTMLElement | null = null;
  const transition = start(() => {
    flushSync(apply);
    name(before, "");
    // Après : la jaquette de la fiche, ou la carte du jeu qu'on vient de fermer
    after = toId ? detailCover() : cardCover(fromId);
    name(after, HERO);
  });
  void transition.finished.finally(() => {
    name(before, "");
    name(after, "");
  });
}
