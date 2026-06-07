import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// GLOBULE pill: square, mono, uppercase, ink-bordered.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border font-mono font-medium uppercase tracking-[0.06em] text-[10px] leading-[1.3] whitespace-nowrap px-[11px] py-1 transition-colors [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        outline: "bg-paper border-ink text-ink",
        soft: "bg-paper-soft border-transparent text-ink",
        solid: "bg-primary border-ink text-primary-foreground",
        count:
          "bg-primary border-ink text-primary-foreground px-[9px] py-[3px] tracking-[0.08em] tabular-nums",
      },
      mono: {
        true: "normal-case tracking-[0.04em]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "outline",
      mono: false,
    },
  }
);

function Badge({
  className,
  variant,
  mono,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
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
