"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tag-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Matches the `gap-1.5` (0.375rem) between chips.
const GAP = 6;

const overflowChipClass =
  "inline-flex shrink-0 cursor-pointer select-none items-center rounded-full border border-ink/10 bg-paper-soft px-2 py-1 font-sans text-xs font-medium leading-none text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper";

/**
 * Renders eval tags on a single row. Tags that don't fit are collapsed behind
 * a "…" trigger; hovering (or focusing) it reveals a popover listing every
 * tag. The number of visible chips is measured against the available width and
 * recomputed on resize, so the row never wraps.
 */
export function TagRow({
  tags,
  orderedTags,
  className,
}: {
  tags: string[];
  orderedTags: string[];
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(tags.length);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function recompute() {
      if (!container || !measure) return;
      const available = container.clientWidth;
      if (available === 0) return;

      const chips = Array.from(
        measure.querySelectorAll<HTMLElement>("[data-tag-chip]")
      );
      const moreEl = measure.querySelector<HTMLElement>("[data-tag-more]");
      const moreW = moreEl ? moreEl.offsetWidth : 0;
      const widths = chips.map((el) => el.offsetWidth);

      // Does everything fit without an overflow trigger?
      let total = 0;
      for (let i = 0; i < widths.length; i++) {
        total += widths[i] + (i > 0 ? GAP : 0);
      }
      if (total <= available) {
        setVisibleCount(tags.length);
        return;
      }

      // Otherwise, fit as many as possible while leaving room for the trigger.
      let used = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i++) {
        const add = widths[i] + (i > 0 ? GAP : 0);
        if (used + add + GAP + moreW <= available) {
          used += add;
          count = i + 1;
        } else {
          break;
        }
      }
      setVisibleCount(Math.max(1, count));
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [tags]);

  const hiddenCount = tags.length - visibleCount;
  const visible = tags.slice(0, visibleCount);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex w-full items-center gap-1.5 overflow-hidden">
        {visible.map((t) => (
          <TagChip
            key={t}
            tag={t}
            colorIndex={orderedTags.indexOf(t)}
            size="card"
            data-tag-chip
          />
        ))}
        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Show all ${tags.length} tags`}
                data-tag-more
                onClick={(e) => {
                  // Sits inside the card link — don't navigate when the user
                  // reaches for the overflow popover.
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={overflowChipClass}
              >
                &hellip;
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <TagChip
                    key={t}
                    tag={t}
                    colorIndex={orderedTags.indexOf(t)}
                    size="card"
                  />
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Hidden measurement layer: every chip plus the overflow trigger, used
          only to compute how many chips fit. Never affects layout. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-1.5"
      >
        {tags.map((t) => (
          <TagChip
            key={t}
            tag={t}
            colorIndex={orderedTags.indexOf(t)}
            size="card"
            data-tag-chip
          />
        ))}
        <span data-tag-more className={overflowChipClass}>
          &hellip;
        </span>
      </div>
    </div>
  );
}
