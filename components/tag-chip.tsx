import * as React from "react";

import { cn } from "@/lib/utils";
import { GlobuleDot } from "@/components/globule";
import { globuleForIndex } from "@/lib/globules";

const chipBase =
  "inline-flex shrink-0 items-center rounded-full border font-sans font-medium leading-none transition-colors";

const chipSizes = {
  filter: "gap-2.5 px-6 py-3 text-sm",
  card: "gap-1.5 px-2 py-1 text-xs",
} as const;

type TagChipProps = {
  tag: string;
  colorIndex: number;
  size?: keyof typeof chipSizes;
  selected?: boolean;
  className?: string;
} & (
  | (React.ComponentProps<"button"> & { as?: "button" })
  | (React.ComponentProps<"span"> & { as: "span" })
);

export function TagChip({
  tag,
  colorIndex,
  size = "filter",
  selected = false,
  className,
  as = "span",
  ...props
}: TagChipProps) {
  const styles = cn(
    chipBase,
    chipSizes[size],
    selected
      ? "border-ink bg-ink text-paper"
      : "border-ink/10 bg-paper-soft text-ink",
    size === "filter" && !selected && "hover:bg-paper-3",
    className
  );

  const content = (
    <>
      <GlobuleDot globule={globuleForIndex(colorIndex)} />
      {tag}
    </>
  );

  if (as === "button") {
    const { as: _as, ...buttonProps } = props as React.ComponentProps<"button"> & {
      as?: "button";
    };
    return (
      <button type="button" className={styles} {...buttonProps}>
        {content}
      </button>
    );
  }

  const { as: _as, ...spanProps } = props as React.ComponentProps<"span"> & {
    as: "span";
  };
  return (
    <span className={styles} {...spanProps}>
      {content}
    </span>
  );
}
