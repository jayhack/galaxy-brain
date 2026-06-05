import * as React from "react";
import { cn } from "@/lib/utils";
import { globuleForIndex, type Globule } from "@/lib/globules";

type GlobuleVars = React.CSSProperties & {
  "--g-color"?: string;
  "--g-shade"?: string;
};

function vars(g: Globule): GlobuleVars {
  return { "--g-color": g.color, "--g-shade": g.shade };
}

/** A glossy globule sphere at an arbitrary size. */
export function Globule({
  globule,
  size,
  className,
  style,
}: {
  globule?: Globule;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const g = globule ?? globuleForIndex(0);
  return (
    <span
      aria-hidden
      className={cn("globule", className)}
      style={{ width: size, height: size, ...vars(g), ...style }}
    />
  );
}

/** Small globule dot (pills, statuses, sidebar rows, bullets). */
export function GlobuleDot({
  globule,
  className,
  style,
}: {
  globule?: Globule;
  className?: string;
  style?: React.CSSProperties;
}) {
  const g = globule ?? globuleForIndex(0);
  return (
    <span
      aria-hidden
      className={cn("g-dot", className)}
      style={{ ...vars(g), ...style }}
    />
  );
}

/** The G + cyan-globule monogram lockup (brand mark). */
export function Monogram({ modifier }: { modifier?: string }) {
  return (
    <span className={cn("logo-monogram", modifier)} aria-hidden>
      <span className="logo-letter">G</span>
      <span
        className="globule logo-dot"
        style={vars({ color: "var(--cyan)", shade: "var(--cyan-d)" })}
      />
    </span>
  );
}

/** Decorative hero cluster of globules. */
export function HeroCluster() {
  const items = [
    { i: 3, size: 78, pos: { right: 8, top: 0 }, extra: "" },
    { i: 1, size: 56, pos: { right: 88, top: 34 }, extra: "zebra" },
    { i: 2, size: 64, pos: { right: 18, top: 96 }, extra: "" },
    { i: 4, size: 40, pos: { right: 96, top: 120 }, extra: "halftone" },
    { i: 0, size: 30, pos: { right: 74, top: 8 }, extra: "" },
  ];
  return (
    <div className="relative h-[190px] w-full" aria-hidden>
      {items.map(({ i, size, pos, extra }) => (
        <Globule
          key={i}
          globule={globuleForIndex(i)}
          size={size}
          className={cn("hover-lift", extra)}
          style={{ position: "absolute", right: pos.right, top: pos.top }}
        />
      ))}
    </div>
  );
}
