import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EvalArt } from "@/components/eval-art";
import { TagChip } from "@/components/tag-chip";

export type EvalCardData = {
  slug: string;
  title: string;
  tagline?: string;
  description?: string;
  tags: string[];
  count: number;
  /** Stable position in the canonical eval list -> picks this eval's globule. */
  colorIndex: number;
  /** Static header image (`/headers/<slug>.jpg`), or null to use the gradient. */
  image?: string | null;
};

export function EvalCard({
  ev,
  orderedTags,
}: {
  ev: EvalCardData;
  orderedTags: string[];
}) {
  return (
    <Link
      href={`/eval/${ev.slug}`}
      className="group block overflow-hidden rounded-md border border-ink bg-paper no-underline transition-colors hover:bg-paper-soft"
    >
      <EvalArt
        colorIndex={ev.colorIndex}
        image={ev.image}
        imageAlt=""
        className="h-24"
      >
        <Badge
          variant="count"
          className="absolute right-3 top-3 border-paper/40 bg-ink/35 text-paper backdrop-blur-sm"
          title={`${ev.count} solution${ev.count === 1 ? "" : "s"}`}
        >
          {ev.count}
        </Badge>
      </EvalArt>
      <div className="p-5">
        <h3 className="font-sans text-xl font-semibold leading-tight tracking-tight text-ink">
          {ev.title}
        </h3>
        <p className="mt-2.5 line-clamp-2 min-h-[2.625rem] text-sm leading-snug text-ink">
          {ev.tagline || ev.description || ""}
        </p>
        <div className="mt-3.5 flex flex-nowrap gap-1.5 overflow-hidden">
          {ev.tags.map((t) => (
            <TagChip
              key={t}
              tag={t}
              colorIndex={orderedTags.indexOf(t)}
              size="card"
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
