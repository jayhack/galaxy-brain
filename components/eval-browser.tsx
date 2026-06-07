"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { GlobuleDot } from "@/components/globule";
import { globuleForIndex } from "@/lib/globules";
import { EvalCard, type EvalCardData } from "@/components/eval-card";

function parseTags(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// How many of the most common tags to show before collapsing the rest.
const COLLAPSED_TAG_COUNT = 8;

export function EvalBrowser({
  evals,
  allTags,
}: {
  evals: EvalCardData[];
  allTags: string[];
}) {
  // Start empty so the server-rendered grid (all evals) is part of the static
  // HTML — no useSearchParams, so this subtree never bails to a client-only
  // render. Any ?tags= filter from a deep link is applied after mount.
  const [selected, setSelected] = React.useState<string[]>([]);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseTags(params.get("tags"));
    if (fromUrl.length) setSelected(fromUrl);
  }, []);

  const selectedSet = new Set(selected);

  // Order tags by how often they appear (most common first), so the collapsed
  // view surfaces the most useful filters. Alphabetical breaks ties for a
  // stable, deterministic order (and stable globule colors).
  const orderedTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of evals)
      for (const t of ev.tags) counts.set(t, (counts.get(t) || 0) + 1);
    return [...allTags].sort((a, b) => {
      const diff = (counts.get(b) || 0) - (counts.get(a) || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  }, [evals, allTags]);

  const hiddenCount = Math.max(0, orderedTags.length - COLLAPSED_TAG_COUNT);
  // Keep selected tags visible even when collapsed, so active filters never hide.
  const visibleTags =
    expanded || hiddenCount === 0
      ? orderedTags
      : orderedTags.filter((t, i) => i < COLLAPSED_TAG_COUNT || selectedSet.has(t));

  function syncUrl(next: string[]) {
    const qs = next.length
      ? `?tags=${next.map(encodeURIComponent).join(",")}`
      : "";
    // Update the URL in place without a navigation/RSC round trip.
    window.history.replaceState(null, "", `/${qs}`);
  }

  function toggle(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    const arr = [...next].sort((a, b) => a.localeCompare(b));
    setSelected(arr);
    syncUrl(arr);
  }

  function clearAll() {
    setSelected([]);
    syncUrl([]);
  }

  const filtered =
    selectedSet.size === 0
      ? evals
      : evals.filter((ev) => ev.tags.some((t) => selectedSet.has(t)));

  const summary =
    selectedSet.size > 0
      ? `${filtered.length}/${evals.length} eval${evals.length === 1 ? "" : "s"} shown`
      : "";

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="g-display text-2xl">Evals</h2>
        {summary && <span className="mono-label opacity-70">{summary}</span>}
      </div>

      {allTags.length > 0 && (
        <div className="mb-6" role="group" aria-label="Filter evals by tag">
          <div className="flex flex-wrap items-center gap-2">
            {visibleTags.map((t) => {
              const on = selectedSet.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(t)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] leading-none transition-colors",
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/10 bg-paper-soft text-ink hover:bg-paper-3"
                  )}
                >
                  <GlobuleDot globule={globuleForIndex(orderedTags.indexOf(t))} />
                  {t}
                </button>
              );
            })}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-ink/30 bg-transparent px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] leading-none text-ink/70 transition-colors hover:bg-paper-soft hover:text-ink"
              >
                {expanded ? "Show fewer" : `+${hiddenCount} more …`}
              </button>
            )}

            {selectedSet.size > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex cursor-pointer items-center rounded-full px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] leading-none text-ink/70 underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {selectedSet.size > 0 && filtered.length === 0 ? (
        <div
          className="mb-4 rounded-md border border-ink bg-paper-soft px-4 py-3 text-sm text-ink"
          role="status"
        >
          No eval matches these tags. Try fewer tags or{" "}
          <button
            type="button"
            onClick={clearAll}
            className="g-link cursor-pointer font-semibold"
          >
            clear filters
          </button>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ev) => (
          <EvalCard key={ev.slug} ev={ev} />
        ))}
      </div>
    </section>
  );
}
