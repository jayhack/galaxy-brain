import { EvalCard, type EvalCardData } from "@/components/eval-card";
import { EvalFilterControls } from "@/components/eval-filter-controls";
import { FEATURED_TAGS, orderTagsWithFeatured } from "@/lib/tags";

export function EvalBrowser({
  evals,
  allTags,
}: {
  evals: EvalCardData[];
  allTags: string[];
}) {
  const orderedTags = orderTagsWithFeatured(evals, allTags);

  return (
    <section>
      <EvalFilterControls
        tags={orderedTags}
        totalCount={evals.length}
        featuredTags={FEATURED_TAGS}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evals.map((ev) => (
          <EvalCard key={ev.slug} ev={ev} orderedTags={orderedTags} />
        ))}
      </div>
    </section>
  );
}
