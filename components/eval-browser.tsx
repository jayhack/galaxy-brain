import { EvalCard, type EvalCardData } from "@/components/eval-card";
import { EvalFilterControls } from "@/components/eval-filter-controls";
import { orderTagsByFrequency } from "@/lib/tags";

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
  const orderedTags = orderTagsByFrequency(evals, allTags);

  return (
    <section>
      <EvalFilterControls
        tags={orderedTags}
        totalCount={evals.length}
        collapsedTagCount={COLLAPSED_TAG_COUNT}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evals.map((ev) => (
          <EvalCard key={ev.slug} ev={ev} orderedTags={orderedTags} />
        ))}
      </div>
    </section>
  );
}
