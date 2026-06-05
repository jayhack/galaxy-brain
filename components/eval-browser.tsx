"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export function EvalBrowser({
  evals,
  allTags,
}: {
  evals: EvalCardData[];
  allTags: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<string[]>(() =>
    parseTags(searchParams.get("tags"))
  );

  const selectedSet = new Set(selected);

  function syncUrl(next: string[]) {
    const qs = next.length
      ? `?tags=${next.map(encodeURIComponent).join(",")}`
      : "";
    router.replace(`/${qs}`, { scroll: false });
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
      : `${evals.length} eval${evals.length === 1 ? "" : "s"}`;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="g-display text-2xl">Evals</h2>
        <span className="mono-label opacity-70">{summary}</span>
      </div>

      {allTags.length > 0 && (
        <div className="mb-6" role="group" aria-label="Filter evals by tag">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="mono-label">&#9671; Filter by tag</span>
            <span className="mono-label opacity-70">
              Match <strong>any</strong> selected tag
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t, i) => {
              const on = selectedSet.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(t)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 border px-[11px] py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] leading-[1.3] transition-colors",
                    on
                      ? "border-ink bg-ink text-paper"
                      : "border-ink bg-paper text-ink hover:bg-paper-soft"
                  )}
                >
                  <GlobuleDot globule={globuleForIndex(i)} />
                  {t}
                </button>
              );
            })}
          </div>
          {selectedSet.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer border border-transparent px-2 py-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink hover:bg-paper-soft"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {selectedSet.size > 0 && filtered.length === 0 ? (
        <div
          className="mb-4 border border-ink bg-paper-soft px-4 py-3 text-sm text-ink"
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
