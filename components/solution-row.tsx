import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HarnessIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { artifactHref, type Eval, type Solution } from "@/lib/content";
import { harnessLogoKind } from "@/lib/globules";

export function SolutionRow({ ev, sol }: { ev: Eval; sol: Solution }) {
  const html = artifactHref(sol.artifactUrl);
  const hasIcon = harnessLogoKind(sol.harness) != null;
  const meta = [
    hasIcon ? "" : sol.harness,
    sol.model,
    sol.projectName ? `project ${sol.projectName}` : "",
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  const firstTech = sol.tech?.[0] || "";

  return (
    <div className="flex w-full min-w-0 flex-row flex-nowrap items-stretch overflow-hidden border border-ink bg-paper hover:bg-paper-soft">
      <Link
        href={`/eval/${ev.slug}/${sol.slug}`}
        className="group flex min-w-0 flex-1 flex-row flex-nowrap items-center gap-2 px-3 py-2.5 no-underline sm:gap-3"
      >
        {firstTech ? (
          <Badge
            variant="outline"
            mono
            className="max-w-36 shrink-0 overflow-hidden text-ellipsis"
            title={firstTech}
          >
            {firstTech}
          </Badge>
        ) : null}
        {hasIcon ? (
          <span className="inline-flex size-5 shrink-0 items-center justify-center text-ink opacity-70 group-hover:opacity-100">
            <HarnessIcon harness={sol.harness} />
          </span>
        ) : null}
        <span className="max-w-[40%] shrink-0 truncate font-mono text-sm font-semibold text-ink sm:max-w-none">
          {sol.slug}
        </span>
        <span className="max-w-[7.5rem] shrink-0 truncate font-mono text-[11px] text-ink/80 sm:max-w-[11rem] sm:text-xs">
          {meta}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-xs text-ink/85"
          title={sol.summary || ""}
        >
          {sol.summary || ""}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5 border-l border-ink py-2 pr-3 pl-2 sm:gap-2">
        {html ? (
          <Button asChild variant="paper" size="xs">
            <a href={html} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              HTML
            </a>
          </Button>
        ) : null}
        <StatusBadge status={sol.outcome?.status} />
      </div>
    </div>
  );
}
