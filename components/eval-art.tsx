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
 * Per-eval header band. When `image` is supplied it is served statically and
 * covers the band, with a dark tint so overlaid text/badges stay legible; the
 * eval's globule gradient remains as the loading/fallback background. Without
 * an image it falls back to the gradient placeholder coloured by the globule.
 * Pass `colorIndex` (the eval's stable position) or an explicit `globule`.
 */
export function EvalArt({
  colorIndex,
  globule,
  className,
  showSphere = false,
  image,
  imageAlt = "",
  children,
}: {
  colorIndex?: number;
  globule?: Globule;
  className?: string;
  showSphere?: boolean;
  image?: string | null;
  imageAlt?: string;
  children?: React.ReactNode;
}) {
  const g = globule ?? globuleForIndex(colorIndex ?? 0);
  return (
    <div
      className={cn("eval-art", image && "eval-art--photo", className)}
      style={vars(g)}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt}
            aria-hidden={imageAlt ? undefined : true}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/15 to-ink/30"
          />
        </>
      ) : null}
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
