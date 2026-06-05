import * as React from "react";

import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

// GLOBULE button: square, ink-bordered, uppercase editorial type.
type ButtonVariant = "ink" | "paper" | "ghost" | "cta";
type ButtonSize = "default" | "sm" | "xs";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold uppercase tracking-[0.16em] leading-none border cursor-pointer select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:pointer-events-none";

const buttonVariantClass: Record<ButtonVariant, string> = {
  ink: "bg-primary text-primary-foreground border-ink hover:bg-[#211f1c]",
  paper: "bg-paper text-ink border-ink hover:bg-paper-soft",
  ghost: "bg-transparent border-transparent text-ink hover:bg-paper-soft",
  cta: "rounded-full border-0 bg-[var(--magenta-d)] text-paper tracking-[0.13em] shadow-[inset_-6px_-8px_14px_rgba(0,0,0,0.32),0_6px_14px_rgba(10,9,8,0.25)] hover:brightness-110",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  default: "h-10 px-5 text-xs",
  sm: "h-9 px-4 text-[11.5px]",
  xs: "h-7 px-[11px] text-[10.5px] tracking-[0.14em]",
};

function buttonVariants({
  variant = "ink",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(buttonBase, buttonVariantClass[variant], buttonSizeClass[size], className);
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
