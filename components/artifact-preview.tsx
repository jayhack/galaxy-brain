"use client";

import * as React from "react";
import { ArrowUpRight, X, ExternalLink } from "lucide-react";

/**
 * Live preview of an HTML artifact in a MacBook-ish (16:10) iframe.
 * The inline frame is non-interactive (so the whole tile is a click target).
 * Hovering applies only a light frost — the output stays readable — and
 * reveals an "Open" highlight bar along the bottom, which opens an in-app
 * full-screen modal where the artifact is fully interactive. The light frost
 * matters because the cursor naturally lands on this tile right after a user
 * clicks through to the page, so it must not blot out the preview.
 */
export function ArtifactPreview({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  // Tracks the history entry we add when opening, so Back closes the modal
  // (and returns to the eval page) instead of navigating away.
  const pushedRef = React.useRef(false);

  const closeModal = React.useCallback(() => {
    if (pushedRef.current) window.history.back();
    else setOpen(false);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (!pushedRef.current) {
      window.history.pushState({ galaxyModal: true }, "");
      pushedRef.current = true;
    }
    const onPop = () => {
      pushedRef.current = false;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeModal]);

  return (
    <>
      <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-md border border-ink bg-ink/[0.04]">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open solution full-screen"
          className="absolute inset-0 flex items-end justify-stretch bg-transparent outline-none transition hover:bg-paper/10 hover:backdrop-blur-[2px] focus-visible:bg-paper/10 focus-visible:backdrop-blur-[2px]"
        >
          <span className="pointer-events-none flex w-full items-center justify-center gap-2 border-t border-ink bg-ink px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-paper opacity-0 shadow-[0_-8px_24px_rgba(10,9,8,0.22)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Open
            <ArrowUpRight className="size-4" />
          </span>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col gap-2 bg-ink/85 p-3 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} (full screen)`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-mono text-xs uppercase tracking-[0.16em] text-paper/90">
              {title}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-paper/40 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-paper hover:bg-paper/10"
              >
                <ExternalLink className="size-3.5" />
                New tab
              </a>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center gap-1.5 rounded-md border border-paper/40 bg-paper px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink hover:bg-paper-soft"
              >
                <X className="size-3.5" />
                Close
              </button>
            </div>
          </div>
          <iframe
            src={src}
            title={title}
            className="size-full flex-1 rounded-md border border-paper/30 bg-paper"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
          />
        </div>
      ) : null}
    </>
  );
}
