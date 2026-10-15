/**
 * Jeux masqués par l'utilisateur : retirés de toute la bibliothèque (sections, favoris,
 * récemment joués, recherche, compteurs, Big Picture). Sans dépendance à React.
 */
export function withoutHidden<G extends { id: string }>(games: G[], hidden: string[]): G[] {
  if (!hidden.length) return games;
  const set = new Set(hidden);
  return games.filter((g) => !set.has(g.id));
}

/** Jeux masqués encore présents dans la bibliothèque, dans l'ordre où ils ont été masqués */
export function hiddenGamesOf<G extends { id: string }>(games: G[], hidden: string[]): G[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  return hidden.flatMap((id) => {
    const g = byId.get(id);
    return g ? [g] : [];
  });
}

export function hideGame(hidden: string[], id: string): string[] {
  return hidden.includes(id) ? hidden : [...hidden, id];
}

export function showGame(hidden: string[], id: string): string[] {
  return hidden.filter((h) => h !== id);
}
