import Link from "next/link";

import { ExternalLinkIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HarnessIcon } from "@/components/icons";
import { artifactHref, type Eval, type Solution } from "@/lib/content";
import { harnessLogoKind } from "@/lib/globules";

export function SolutionRow({ ev, sol }: { ev: Eval; sol: Solution }) {
  const html = artifactHref(sol.artifactUrl);
  const hasIcon = harnessLogoKind(sol.harness) != null;
  const short = sol.harnessShort || sol.harness.split("-")[0];
  const type = sol.tech?.[0] || (sol.artifactUrl ? "html" : "");

  return (
    <div className="flex w-full min-w-0 flex-row flex-nowrap items-stretch overflow-hidden rounded-md border border-ink bg-paper hover:bg-paper-soft">
      <Link
        href={`/eval/${ev.slug}/${sol.slug}`}
        className="group flex min-w-0 flex-1 flex-row flex-nowrap items-center gap-2.5 px-3 py-2.5 no-underline sm:gap-3"
      >
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center text-ink"
          title={short}
          aria-label={short}
        >
          {hasIcon ? (
            <HarnessIcon harness={sol.harness} className="size-[18px]" />
          ) : (
            <span className="font-mono text-[11px] font-semibold uppercase">
              {short.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="shrink-0 truncate font-mono text-sm font-semibold text-ink">
          {sol.slug}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-xs text-ink/85"
          title={sol.summary || ""}
        >
          {sol.summary || ""}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5 border-l border-ink py-2 pr-3 pl-2.5 sm:gap-2">
        {type ? (
          <Badge variant="soft" className="hidden sm:inline-flex">
            {type}
          </Badge>
        ) : null}
        {html ? (
          <Button asChild variant="paper" size="xs">
            <a href={html} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-3.5" />
              Open
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
