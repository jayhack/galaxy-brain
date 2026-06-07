"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import { CopyButton } from "@/components/copy-button";

/**
 * Right-aligned actions for a section header (Prompt / README): a GitHub link
 * on the file path plus a copy button. Lives inside a <summary>, so clicks must
 * not toggle the surrounding <details>.
 */
export function SectionHeaderActions({
  filePath,
  fileHref,
  copyText,
}: {
  filePath?: string;
  fileHref?: string;
  copyText?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
      {filePath ? (
        fileHref ? (
          <a
            href={fileHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group/path inline-flex min-w-0 items-center gap-1 font-mono text-xs text-ink/60 no-underline transition-colors hover:text-ink"
            aria-label={`View ${filePath} on GitHub`}
          >
            <span className="truncate">{filePath}</span>
            <ArrowUpRight className="size-3.5 shrink-0 opacity-70 transition-transform duration-200 group-hover/path:-translate-y-px group-hover/path:translate-x-px group-hover/path:opacity-100" />
          </a>
        ) : (
          <span className="truncate font-mono text-xs text-ink/60">
            {filePath}
          </span>
        )
      ) : null}
      {copyText ? <CopyButton text={copyText} className="shrink-0" /> : null}
    </span>
  );
}
