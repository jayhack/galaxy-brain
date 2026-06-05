import Link from "next/link";

import { Monogram } from "@/components/globule";
import { SidebarNav, type EvalNavItem } from "@/components/sidebar-nav";

export function SiteSidebar({ evals }: { evals: EvalNavItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-ink px-4">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2.5 no-underline"
        >
          <Monogram />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="logo-wordmark truncate">galaxy-brain</span>
            <span className="mono-label truncate opacity-70">
              A collection of agent evals
            </span>
          </span>
        </Link>
      </div>
      <SidebarNav evals={evals} className="flex-1 overflow-y-auto p-2" />
      <div className="stamp-block shrink-0 border-t border-ink px-4 py-3 opacity-70">
        cream &middot; ink &middot; six globules
      </div>
    </div>
  );
}
