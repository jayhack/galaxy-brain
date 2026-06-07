import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Static (non-collapsible) bordered card that mirrors CollapsibleSection's
 * header treatment: a darker `paper-3` header bar with a display-type label and
 * optional right-aligned meta, over a `paper` body. Use for sections that
 * shouldn't fold but should read as the same card as the prompt / README.
 */
export function SectionCard({
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "section overflow-hidden rounded-md border border-ink bg-paper",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <span className="g-display text-lg">{title}</span>
        {meta ? <span className="shrink-0">{meta}</span> : null}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
