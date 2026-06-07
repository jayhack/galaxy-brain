/** Order tags by frequency (most common first), then alphabetically for stable globule colors. */
export function orderTagsByFrequency(
  evals: { tags: string[] }[],
  allTags: string[]
): string[] {
  const counts = new Map<string, number>();
  for (const ev of evals)
    for (const t of ev.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...allTags].sort((a, b) => {
    const diff = (counts.get(b) || 0) - (counts.get(a) || 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}
