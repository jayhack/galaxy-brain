import Link from "next/link";

import { EvalArt } from "@/components/eval-art";
import { TagRow } from "@/components/tag-row";

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
  /** Blurred SVG approximation of the header photo, shown while it loads. */
  placeholder?: string | null;
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
      className="group flex h-full flex-col overflow-hidden rounded-md border border-ink bg-paper no-underline transition-colors hover:bg-paper-soft"
    >
      <EvalArt
        colorIndex={ev.colorIndex}
        image={ev.image}
        placeholder={ev.placeholder}
        imageAlt=""
        className="h-36"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 font-sans text-xl font-semibold leading-tight tracking-tight text-ink">
            {ev.title}
          </h3>
          <span
            className="shrink-0 font-sans text-sm font-medium tabular-nums text-ink/55"
            title={`${ev.count} solution${ev.count === 1 ? "" : "s"}`}
          >
            {ev.count}
          </span>
        </div>
        <p className="mt-2.5 line-clamp-2 h-[2.75rem] text-sm leading-[1.375] text-ink">
          {ev.tagline || ev.description || ""}
        </p>
        {ev.tags.length > 0 && (
          <TagRow
            tags={ev.tags}
            orderedTags={orderedTags}
            className="mt-auto pt-3.5"
          />
        )}
      </div>
    </Link>
  );
}
