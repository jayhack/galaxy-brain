import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HarnessIcon } from "@/components/icons";
import { artifactHref, type Eval, type Solution } from "@/lib/content";
import { harnessLogoKind, type Globule } from "@/lib/globules";

type GlobuleVars = React.CSSProperties & {
  "--g-color"?: string;
  "--g-shade"?: string;
};

/**
 * Gallery card for a single solution. The HTML artifact renders as a heavily
 * frosted backdrop (it clears a little on hover), while the model identity —
 * a large logo plate and the model name — is the hero of the card. The whole
 * card links to the solution page (where it opens full-screen).
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
  const type = sol.tech?.[0] || (sol.artifactUrl ? "html" : "");

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
      href={`/eval/${ev.slug}/${sol.slug}`}
      aria-label={`${sol.slug} solution`}
      className="group relative flex aspect-[16/9] w-full flex-col items-center justify-center overflow-hidden rounded-md border border-ink bg-ink/[0.04] no-underline"
    >
      {artifact ? (
        <iframe
          src={artifact}
          title={sol.slug}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="absolute inset-0" style={placeholderStyle} />
      )}

      {/* Heavy frost: the artifact is just a textured backdrop. Clears a touch on hover. */}
      <div className="absolute inset-0 bg-paper/70 backdrop-blur-lg transition duration-300 group-hover:bg-paper/40 group-hover:backdrop-blur-md group-focus-visible:bg-paper/40" />

      {type ? (
        <Badge variant="soft" className="absolute right-3 top-3 z-10">
          {type}
        </Badge>
      ) : null}

      {/* Model identity — the hero of the card. */}
      <div className="relative z-10 flex flex-col items-center gap-3.5 px-6 text-center">
        <span
          className="flex size-16 items-center justify-center rounded-full border border-ink bg-paper text-ink shadow-[0_6px_20px_rgba(10,9,8,0.16)] transition-transform duration-300 group-hover:-translate-y-0.5"
          title={short}
          aria-label={short}
        >
          {hasIcon ? (
            <HarnessIcon harness={sol.harness} className="size-9" />
          ) : (
            <span className="font-mono text-lg font-semibold uppercase">
              {short.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="max-w-full truncate font-mono text-xl font-semibold tracking-tight text-ink">
          {sol.slug}
        </span>
      </div>

      {/* View hint, revealed on hover. */}
      <span className="absolute bottom-3.5 z-10 inline-flex items-center gap-1 font-sans text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/0 transition-colors duration-300 group-hover:text-ink/75 group-focus-visible:text-ink/75">
        View solution
        <ArrowUpRight className="size-3.5" />
      </span>
    </Link>
  );
}
