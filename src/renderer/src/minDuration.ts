/**
 * Lance une tâche et ne rend la main qu'après la plus longue des deux durées : la tâche
 * elle-même ou `ms` millisecondes. Un échec de la tâche est avalé : l'appelant revient
 * simplement à son état initial (utilisé pour l'état de chargement du bouton Scanner).
 */
export async function withMinDuration(task: () => unknown, ms: number): Promise<void> {
  await Promise.allSettled([
    Promise.resolve().then(task),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}
