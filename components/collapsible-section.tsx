import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionHeaderActions } from "@/components/section-header-actions";

/**
 * Collapsible section built on native <details> (no client JS, SSR-friendly).
 * Used to fold long markdown panels (prompt / README). The darker header bar
 * carries the label on the left and, on the right, a GitHub link on the file
 * path plus a copy button.
 */
export function CollapsibleSection({
  title,
  filePath,
  fileHref,
  copyText,
  meta,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  filePath?: string;
  fileHref?: string;
  copyText?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const hasActions = Boolean(filePath || copyText);
  return (
    <details
      className={cn(
        "section overflow-hidden rounded-md border border-ink bg-paper",
        className
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <span className="flex min-w-0 shrink-0 items-center gap-2">
          <ChevronDown
            className="section-chevron size-4 shrink-0 text-ink/70"
            aria-hidden
          />
          <span className="g-display text-lg">{title}</span>
        </span>
        {hasActions ? (
          <SectionHeaderActions
            filePath={filePath}
            fileHref={fileHref}
            copyText={copyText}
          />
        ) : meta ? (
          <span className="shrink-0">{meta}</span>
        ) : null}
      </summary>
      <div className="p-5">{children}</div>
    </details>
  );
}
