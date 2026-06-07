"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Crumb = { label: string; href?: string };

function buildCrumbs(
  pathname: string,
  evalTitles: Record<string, string>
): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Overview", href: "/" }];

  if (parts[0] === "about") {
    crumbs.push({ label: "About" });
  } else if (parts[0] === "eval" && parts[1]) {
    const slug = decodeURIComponent(parts[1]);
    const title = evalTitles[slug] || slug;
    if (parts[2]) {
      crumbs.push({ label: title, href: `/eval/${parts[1]}` });
      crumbs.push({ label: decodeURIComponent(parts[2]) });
    } else {
      crumbs.push({ label: title });
    }
  }

  // On home, "Overview" is the current page (no link).
  if (crumbs.length === 1) crumbs[0] = { label: "Overview" };
  return crumbs;
}

export function HeaderBreadcrumb({
  evalTitles,
  className,
}: {
  evalTitles: Record<string, string>;
  className?: string;
}) {
  const pathname = usePathname() || "/";
  const crumbs = buildCrumbs(pathname, evalTitles);

  return (
    <Breadcrumb className={cn("min-w-0", className)}>
      <BreadcrumbList className="flex-nowrap gap-1.5 font-sans text-xs tracking-[0.02em] sm:gap-2">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${c.label}-${i}`}>
              <BreadcrumbItem>
                {isLast || !c.href ? (
                  <BreadcrumbPage className="max-w-[42vw] truncate text-ink sm:max-w-xs">
                    {c.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
