/** Hidden games are removed from every list and counter; framework-free */
export function withoutHidden<G extends { id: string }>(games: G[], hidden: string[]): G[] {
  if (!hidden.length) return games
  const set = new Set(hidden)
  return games.filter((g) => !set.has(g.id))
}

/** Hidden games still in the library, in the order they were hidden */
export function hiddenGamesOf<G extends { id: string }>(games: G[], hidden: string[]): G[] {
  const byId = new Map(games.map((g) => [g.id, g]))
  return hidden.flatMap((id) => {
    const g = byId.get(id)
    return g ? [g] : []
  })
}

export function hideGame(hidden: string[], id: string): string[] {
  return hidden.includes(id) ? hidden : [...hidden, id]
}

export function showGame(hidden: string[], id: string): string[] {
  return hidden.filter((h) => h !== id)
}
