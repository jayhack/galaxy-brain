import * as React from "react";

import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

// GLOBULE pill: square, mono, uppercase, ink-bordered.
type BadgeVariant = "outline" | "soft" | "solid" | "count";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-md border font-mono font-medium uppercase tracking-[0.14em] text-[10px] leading-[1.3] whitespace-nowrap px-[11px] py-1 transition-colors [&_svg]:shrink-0";

const badgeVariantClass: Record<BadgeVariant, string> = {
  outline: "bg-paper border-ink text-ink",
  soft: "bg-paper-soft border-transparent text-ink",
  solid: "bg-primary border-ink text-primary-foreground",
  count:
    "bg-primary border-ink text-primary-foreground px-[9px] py-[3px] tracking-[0.08em] tabular-nums",
};

function badgeVariants({
  variant = "outline",
  mono = false,
  className,
}: {
  variant?: BadgeVariant;
  mono?: boolean;
  className?: string;
}) {
  return cn(
    badgeBase,
    badgeVariantClass[variant],
    mono && "normal-case tracking-[0.04em]",
    className
  );
}

function Badge({
  className,
  variant,
  mono,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  {
    variant?: BadgeVariant;
    mono?: boolean;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, mono, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
