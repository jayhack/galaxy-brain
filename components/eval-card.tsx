import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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

export function EvalCard({ ev }: { ev: EvalCardData }) {
  return (
    <Link
      href={`/eval/${ev.slug}`}
      data-eval-card
      data-tags={ev.tags.join(",")}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-ink bg-paper no-underline transition-colors hover:bg-paper-soft"
    >
      <EvalArt
        colorIndex={ev.colorIndex}
        image={ev.image}
        placeholder={ev.placeholder}
        imageAlt=""
        className="h-32"
      >
        <Badge
          variant="count"
          className="absolute right-3 top-3 border-paper/40 bg-ink/35 text-paper backdrop-blur-sm"
          title={`${ev.count} solution${ev.count === 1 ? "" : "s"}`}
        >
          {ev.count}
        </Badge>
      </EvalArt>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sans text-xl font-semibold leading-tight tracking-tight text-ink">
          {ev.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-ink">
          {ev.tagline || ev.description || ""}
        </p>
        {ev.tags.length > 0 && <TagRow tags={ev.tags} className="mt-auto pt-3.5" />}
      </div>
    </Link>
  );
}
