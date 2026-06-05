import Link from "next/link";

import { Globule, GlobuleDot } from "@/components/globule";
import { Button } from "@/components/ui/button";
import { globuleForIndex } from "@/lib/globules";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center border border-ink p-10 text-center">
      <div className="flex max-w-md flex-col items-center">
        <Globule globule={globuleForIndex(1)} size={64} className="halftone" />
        <h1 className="g-display mt-6 text-4xl sm:text-5xl">Not found</h1>
        <p className="mt-2 text-ink/90">
          That page does not exist or has moved.
        </p>
        <Button asChild variant="ink" size="sm" className="mt-6">
          <Link href="/">
            <GlobuleDot globule={globuleForIndex(0)} />
            Back to overview
          </Link>
        </Button>
      </div>
    </div>
  );
}
