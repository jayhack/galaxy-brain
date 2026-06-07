"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { GlobuleDot } from "@/components/globule";
import { globuleForIndex } from "@/lib/globules";

export type EvalNavItem = { slug: string; title: string; count: number };

const linkBase =
  "flex items-center gap-2.5 px-2.5 py-2 font-sans text-sm font-medium text-ink no-underline border border-transparent hover:bg-paper hover:border-paper-3";
const linkActive = "bg-paper border-ink font-bold";

export function SidebarNav({
  evals,
  className,
}: {
  evals: EvalNavItem[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      <Link href="/" className={cn(linkBase, pathname === "/" && linkActive)}>
        <Home className="size-4 shrink-0" />
        <span>Overview</span>
      </Link>
      <Link
        href="/about"
        className={cn(linkBase, pathname === "/about" && linkActive)}
      >
        <Info className="size-4 shrink-0" />
        <span>About</span>
      </Link>

      {evals.map((ev, i) => {
        const active =
          pathname === `/eval/${ev.slug}` ||
          pathname.startsWith(`/eval/${ev.slug}/`);
        const tail =
          ev.count === 0
            ? " \u00b7 no solutions yet"
            : ` \u00b7 ${ev.count} solution${ev.count === 1 ? "" : "s"}`;
        return (
          <Link
            key={ev.slug}
            href={`/eval/${ev.slug}`}
            title={`${ev.title}${tail}`}
            className={cn(linkBase, "justify-between", active && linkActive)}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <GlobuleDot globule={globuleForIndex(i)} />
              <span className="truncate">{ev.title}</span>
            </span>
            <span
              aria-label={`${ev.count} solution${ev.count === 1 ? "" : "s"}`}
              className={cn(
                "min-w-[1.4rem] shrink-0 border border-ink px-1.5 py-0.5 text-center font-sans text-[0.65rem] font-semibold tabular-nums",
                active ? "bg-ink text-paper" : "bg-paper-soft text-ink"
              )}
            >
              {ev.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
