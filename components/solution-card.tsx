import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HarnessIcon } from "@/components/icons";
import { artifactHref, type Eval, type Solution } from "@/lib/content";
import { harnessLogoKind, type Globule } from "@/lib/globules";

type GlobuleVars = React.CSSProperties & {
  "--g-color"?: string;
  "--g-shade"?: string;
};

/**
 * Gallery card for a single solution. A black surface letterboxes the HTML
 * artifact, which renders front-and-center. The model identity — harness logo
 * + name — sits in a solid black bottom bar so it stays legible against any
 * artifact.
 * The whole card links to the solution page.
 */
export function SolutionCard({
  ev,
  sol,
  globule,
}: {
  ev: Eval;
  sol: Solution;
  globule?: Globule;
}) {
  const artifact = artifactHref(sol.artifactUrl);
  const hasIcon = harnessLogoKind(sol.harness) != null;
  const short = sol.harnessShort || sol.harness.split("-")[0];

  const placeholderStyle: GlobuleVars | undefined = globule
    ? {
        "--g-color": globule.color,
        "--g-shade": globule.shade,
        background:
          "radial-gradient(circle at 28% 22%, rgba(255,255,255,0.4), rgba(255,255,255,0) 46%), radial-gradient(135% 145% at 72% 125%, var(--g-shade), var(--g-color) 72%)",
      }
    : undefined;

  return (
    <Link
      id={`solution-${sol.slug}`}
      href={`/eval/${ev.slug}/${sol.slug}`}
      aria-label={`${sol.slug} solution`}
      className="group relative flex aspect-[16/9] w-full scroll-mt-24 flex-col overflow-hidden rounded-md border border-ink bg-ink no-underline"
      style={{ clipPath: "inset(0 round 10px)" }}
    >
      {artifact ? (
        <iframe
          src={artifact}
          title={sol.slug}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full border-0"
          sandbox="allow-same-origin"
        />
      ) : (
        <div className="absolute inset-0" style={placeholderStyle} />
      )}

      {artifact ? (
        <div className="absolute inset-0 z-[1] transition duration-200 group-hover:backdrop-blur-[1px] group-focus-visible:backdrop-blur-[1px]" />
      ) : null}

      {/* Model identity, anchored to the bottom over a solid black footer. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2.5 border-t border-paper/10 bg-ink px-3.5 py-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/20 bg-paper text-ink shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          title={short}
          aria-label={short}
        >
          {hasIcon ? (
            <HarnessIcon harness={sol.harness} className="size-5" />
          ) : (
            <span className="font-sans text-[11px] font-semibold uppercase">
              {short.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="min-w-0 truncate font-sans text-sm font-semibold tracking-tight text-paper drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
          {sol.slug}
        </span>
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-paper/80 group-hover:flex group-focus-visible:flex">
          open
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
