"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { MenuIcon, XIcon } from "@/components/icons";
import { SiteSidebar } from "@/components/site-sidebar";
import type { EvalNavItem } from "@/components/sidebar-nav";

export function MobileDrawer({ evals }: { evals: EvalNavItem[] }) {
  const [open, setOpen] = React.useState(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="inline-flex size-10 items-center justify-center border border-ink bg-paper text-ink hover:bg-paper-soft lg:hidden"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            className="paper-soft fixed inset-y-0 left-0 flex w-72 flex-col border-r border-ink shadow-lg"
          >
            <h2 id="mobile-navigation-title" className="sr-only">
              Navigation
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close navigation"
              className="absolute right-4 top-4 z-10 opacity-70 hover:opacity-100"
              onClick={() => setOpen(false)}
            >
              <XIcon className="size-5" />
            </button>
            <SiteSidebar evals={evals} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
