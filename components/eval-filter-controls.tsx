"use client";

import * as React from "react";

import { TagChip } from "@/components/tag-chip";

function parseTags(value: string | null): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function syncUrl(next: string[]) {
  const qs = next.length ? `?tags=${next.map(encodeURIComponent).join(",")}` : "";
  // Update the URL in place without a navigation/RSC round trip.
  window.history.replaceState(null, "", `/${qs}`);
}

export function EvalFilterControls({
  tags,
  totalCount,
  collapsedTagCount,
}: {
  tags: string[];
  totalCount: number;
  collapsedTagCount: number;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(totalCount);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseTags(params.get("tags"));
    if (fromUrl.length) setSelected(fromUrl);
  }, []);

  React.useEffect(() => {
    const selectedSet = new Set(selected);
    const cards = document.querySelectorAll<HTMLElement>("[data-eval-card]");
    let nextVisibleCount = 0;

    cards.forEach((card) => {
      const cardTags = parseTags(card.dataset.tags || "");
      const visible =
        selectedSet.size === 0 || cardTags.some((tag) => selectedSet.has(tag));
      card.hidden = !visible;
      if (visible) nextVisibleCount += 1;
    });

    setVisibleCount(nextVisibleCount);
  }, [selected]);

  const selectedSet = new Set(selected);
  const hiddenCount = Math.max(0, tags.length - collapsedTagCount);
  // Keep selected tags visible even when collapsed, so active filters never hide.
  const visibleTags =
    expanded || hiddenCount === 0
      ? tags
      : tags.filter((tag, i) => i < collapsedTagCount || selectedSet.has(tag));

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

  const summary =
    selectedSet.size > 0
      ? `${visibleCount}/${totalCount} eval${totalCount === 1 ? "" : "s"} shown`
      : "";

  return (
    <>
      {tags.length > 0 && (
        <div className="mb-6" role="group" aria-label="Filter evals by tag">
          <div className="tag-scroller -mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            {visibleTags.map((tag) => {
              const on = selectedSet.has(tag);
              return (
                <TagChip
                  key={tag}
                  as="button"
                  tag={tag}
                  colorIndex={tags.indexOf(tag)}
                  size="filter"
                  selected={on}
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className="cursor-pointer"
                />
              );
            })}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-dashed border-ink/30 bg-transparent px-6 py-3 font-sans text-sm font-medium leading-none text-ink/70 transition-colors hover:bg-paper-soft hover:text-ink"
              >
                {expanded ? "Show fewer" : `+${hiddenCount} more …`}
              </button>
            )}

            {selectedSet.size > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm font-medium leading-none text-ink/70 underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {summary && (
            <div className="mt-2 text-right">
              <span className="mono-label opacity-70">{summary}</span>
            </div>
          )}
        </div>
      )}

      {selectedSet.size > 0 && visibleCount === 0 ? (
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
    </>
  );
}
