import Link from "next/link";

import { Globule, GlobuleDot } from "@/components/globule";
import { Button } from "@/components/ui/button";
import { globuleForIndex } from "@/lib/globules";
import { cn } from "@/lib/utils";

const cluster = [
  { i: 1, size: 116, left: "50%", top: "50%", extra: "" },
  { i: 3, size: 64, left: "16%", top: "24%", extra: "" },
  { i: 2, size: 52, left: "82%", top: "30%", extra: "zebra" },
  { i: 4, size: 44, left: "78%", top: "78%", extra: "halftone" },
  { i: 5, size: 38, left: "20%", top: "76%", extra: "" },
  { i: 0, size: 26, left: "60%", top: "12%", extra: "" },
];

export default function NotFound() {
  return (
    <div className="paper fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
      <div
        className="relative mb-10 h-[260px] w-full max-w-[420px]"
        aria-hidden
      >
        {cluster.map(({ i, size, left, top, extra }) => (
          <Globule
            key={i}
            globule={globuleForIndex(i)}
            size={size}
            className={cn("hover-lift", extra)}
            style={{
              position: "absolute",
              left,
              top,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>

      <p className="masthead-caps text-[11px] opacity-70">404 &middot; Not found</p>
      <h1 className="g-display mt-3 text-5xl sm:text-6xl">Not found</h1>
      <p className="mt-3 max-w-md text-ink/80">
        That page drifted out of orbit. It does not exist or has moved.
      </p>

      <Button asChild variant="ink" size="default" className="mt-8">
        <Link href="/">
          <GlobuleDot globule={globuleForIndex(0)} />
          All evals
        </Link>
      </Button>
    </div>
  );
}
