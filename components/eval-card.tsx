import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export type EvalCardData = {
  slug: string;
  title: string;
  tagline?: string;
  description?: string;
  tags: string[];
  count: number;
};

export function EvalCard({ ev }: { ev: EvalCardData }) {
  return (
    <Link
      href={`/eval/${ev.slug}`}
      className="relative block border border-ink bg-paper p-5 no-underline transition-colors hover:bg-paper-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-sans text-xl font-bold leading-tight tracking-tight text-ink">
          {ev.title}
        </h3>
        <Badge
          variant="count"
          title={`${ev.count} solution${ev.count === 1 ? "" : "s"}`}
        >
          {ev.count}
        </Badge>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-ink">
        {ev.tagline || ev.description || ""}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {ev.tags.map((t) => (
          <Badge key={t} variant="soft">
            {t}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
