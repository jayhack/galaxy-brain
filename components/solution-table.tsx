import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HarnessIcon } from "@/components/icons";
import { artifactHref, type Eval, type Solution } from "@/lib/content";
import { harnessLogoKind } from "@/lib/globules";

/**
 * Scannable, table-style listing of every solution for an eval. Each row reads
 * left-to-right as logo -> model name -> a short "heads up" (the summary) ->
 * actions, so several models can be compared at a glance. The whole row links
 * to the solution detail page (stretched link); the "Open" button jumps
 * straight to the live HTML artifact.
 */
export function SolutionTable({ ev }: { ev: Eval }) {
  return (
    <div className="overflow-hidden rounded-md border border-ink bg-paper">
      {/* Column headers — hidden on mobile, where rows stack instead. */}
      <div className="hidden border-b border-ink bg-paper-soft px-4 py-2 sm:grid sm:grid-cols-[minmax(170px,230px)_1fr_auto] sm:items-center sm:gap-4">
        <span className="mono-label opacity-70">Model</span>
        <span className="mono-label opacity-70">Heads up</span>
        <span className="mono-label justify-self-end opacity-70">Output</span>
      </div>

      <div className="divide-y divide-ink">
        {ev.solutions.map((sol) => (
          <SolutionTableRow key={sol.slug} ev={ev} sol={sol} />
        ))}
      </div>
    </div>
  );
}

function SolutionTableRow({ ev, sol }: { ev: Eval; sol: Solution }) {
  const html = artifactHref(sol.artifactUrl);
  const hasIcon = harnessLogoKind(sol.harness) != null;
  const short = sol.harnessShort || sol.harness.split("-")[0];
  const type = sol.tech?.[0] || (sol.artifactUrl ? "html" : "");

  return (
    <div className="group relative grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-paper-soft sm:grid-cols-[minmax(170px,230px)_1fr_auto] sm:gap-4">
      {/* Model identity: logo plate + model name + harness label. */}
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ink bg-paper text-ink"
          title={short}
          aria-label={short}
        >
          {hasIcon ? (
            <HarnessIcon harness={sol.harness} className="size-5" />
          ) : (
            <span className="font-mono text-[11px] font-semibold uppercase">
              {short.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="min-w-0 leading-tight">
          <Link
            href={`/eval/${ev.slug}/${sol.slug}`}
            aria-label={`${sol.model} solution`}
            className="block truncate font-mono text-sm font-semibold text-ink no-underline after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {sol.model}
          </Link>
          <span className="block truncate font-mono text-[11px] lowercase text-ink/55">
            {short}
          </span>
        </span>
      </div>

      {/* Heads up: the summary, trimmed to two lines so rows stay even. */}
      <p
        className="col-span-2 col-start-1 row-start-2 line-clamp-2 text-sm leading-snug text-ink/80 sm:col-span-1 sm:col-start-2 sm:row-start-1"
        title={sol.summary || ""}
      >
        {sol.summary || "\u2014"}
      </p>

      {/* Actions sit above the stretched row link via z-index. */}
      <div className="relative z-10 col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3">
        {type ? (
          <Badge variant="soft" className="hidden md:inline-flex">
            {type}
          </Badge>
        ) : null}
        {html ? (
          <Button asChild variant="paper" size="xs">
            <a href={html} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open
            </a>
          </Button>
        ) : null}
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-ink/35 transition-colors group-hover:text-ink/80"
        />
      </div>
    </div>
  );
}
