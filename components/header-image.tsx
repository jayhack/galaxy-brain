"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Header photo with a blur-up reveal. The blurred SVG `placeholder` (a tiny
 * approximation of the photo) is painted immediately as the band background;
 * the full-resolution photo loads on top starting blurred + transparent and
 * sharpens/fades in once it decodes. Falls back gracefully if the image is
 * already cached (onLoad may not fire) by checking `complete` on mount.
 */
export function HeaderImage({
  src,
  placeholder,
  alt = "",
}: {
  src: string;
  placeholder?: string | null;
  alt?: string;
}) {
  const ref = React.useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      {placeholder ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-200",
            loaded ? "opacity-0" : "opacity-100"
          )}
          style={{ backgroundImage: `url("${placeholder}")` }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-[opacity,filter] duration-200 ease-out",
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-md"
        )}
      />
    </>
  );
}
