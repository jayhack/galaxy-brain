import * as React from "react";

import { cn } from "@/lib/utils";
import { globuleForIndex, type Globule } from "@/lib/globules";
import { Globule as GlobuleSphere } from "@/components/globule";

type GlobuleVars = React.CSSProperties & {
  "--g-color"?: string;
  "--g-shade"?: string;
};

function vars(g: Globule): GlobuleVars {
  return { "--g-color": g.color, "--g-shade": g.shade };
}

/**
 * Per-eval gradient "header image". Each eval is its own globule, so the
 * band is coloured by that eval's sphere (placeholder until real art lands).
 * Pass `colorIndex` (the eval's stable position) or an explicit `globule`.
 */
export function EvalArt({
  colorIndex,
  globule,
  className,
  showSphere = false,
  children,
}: {
  colorIndex?: number;
  globule?: Globule;
  className?: string;
  showSphere?: boolean;
  children?: React.ReactNode;
}) {
  const g = globule ?? globuleForIndex(colorIndex ?? 0);
  return (
    <div className={cn("eval-art", className)} style={vars(g)}>
      {showSphere && (
        <GlobuleSphere
          globule={g}
          size={92}
          className="pointer-events-none absolute -bottom-7 left-5 opacity-95"
        />
      )}
      {children}
    </div>
  );
}
