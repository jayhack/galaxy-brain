import { EvalCard, type EvalCardData } from "@/components/eval-card";
import { EvalFilterControls } from "@/components/eval-filter-controls";

// How many of the most common tags to show before collapsing the rest.
const COLLAPSED_TAG_COUNT = 8;

export function EvalBrowser({
  evals,
  allTags,
}: {
  evals: EvalCardData[];
  allTags: string[];
}) {
  // Order tags by how often they appear (most common first), so the collapsed
  // view surfaces the most useful filters. Alphabetical breaks ties for a
  // stable, deterministic order (and stable globule colors).
  const counts = new Map<string, number>();
  for (const ev of evals) {
    for (const t of ev.tags) counts.set(t, (counts.get(t) || 0) + 1);
  }
  const orderedTags = [...allTags].sort((a, b) => {
    const diff = (counts.get(b) || 0) - (counts.get(a) || 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  return (
    <section>
      <EvalFilterControls
        tags={orderedTags}
        totalCount={evals.length}
        collapsedTagCount={COLLAPSED_TAG_COUNT}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evals.map((ev) => (
          <EvalCard key={ev.slug} ev={ev} />
        ))}
      </div>
    </section>
  );
}
