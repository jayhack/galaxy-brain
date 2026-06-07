import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Collapsible section built on native <details> (no client JS, SSR-friendly).
 * Used to fold long markdown panels (prompt / README).
 */
export function CollapsibleSection({
  title,
  meta,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "section overflow-hidden rounded-md border border-ink bg-paper",
        className
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <span className="flex items-center gap-2">
          <ChevronDown
            className="section-chevron size-4 shrink-0 text-ink/70"
            aria-hidden
          />
          <span className="g-display text-lg">{title}</span>
        </span>
        {meta ? <span className="shrink-0">{meta}</span> : null}
      </summary>
      <div className="p-5">{children}</div>
    </details>
  );
}
