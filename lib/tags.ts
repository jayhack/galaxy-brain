/** Tags surfaced above the fold before the "View all" control. */
export const FEATURED_TAGS = [
  "simulation",
  "3d",
  "research",
  "narrative",
  "finance",
  "games",
] as const;

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

/** Featured tags first (in list order), then the rest by frequency. */
export function orderTagsWithFeatured(
  evals: { tags: string[] }[],
  allTags: string[],
  featuredTags: readonly string[] = FEATURED_TAGS
): string[] {
  const featuredSet = new Set(featuredTags);
  const featured = featuredTags.filter((tag) => allTags.includes(tag));
  const rest = orderTagsByFrequency(evals, allTags).filter(
    (tag) => !featuredSet.has(tag)
  );
  return [...featured, ...rest];
}
