import { Suspense } from "react";

import { getEvals, getAllTags } from "@/lib/content";
import { Monogram, HeroCluster } from "@/components/globule";
import { EvalBrowser } from "@/components/eval-browser";
import type { EvalCardData } from "@/components/eval-card";

export default function HomePage() {
  const evals: EvalCardData[] = getEvals().map((ev) => ({
    slug: ev.slug,
    title: ev.title,
    tagline: ev.tagline,
    description: ev.description,
    tags: ev.tags || [],
    count: ev.solutions.length,
  }));
  const allTags = getAllTags();

  return (
    <>
      <section className="paper-soft relative mb-8 overflow-hidden border border-ink">
        <div className="masthead-caps px-6 pt-5 text-[11px] opacity-90 sm:px-10">
          Agent &middot; Evals &middot; MMXXVI &middot;
        </div>
        <div className="grid grid-cols-12 items-center gap-6 p-6 pt-3 sm:p-10 sm:pt-3">
          <div className="col-span-12 max-w-3xl md:col-span-8">
            <div className="grid max-w-4xl grid-cols-[auto_minmax(0,1fr)] items-center gap-4 md:gap-6">
              <Monogram modifier="logo-monogram--hero" />
              <div className="flex min-w-0 flex-col gap-3">
                <h1 className="g-display min-w-0 text-3xl sm:text-5xl">
                  galaxy-brain
                </h1>
                <p className="serif-italic max-w-xl text-lg leading-snug sm:text-xl">
                  A chromatic quarterly of agent evals &mdash; each eval is a
                  prompt, each solution one harness/model pair&apos;s attempt at
                  it.
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:col-span-4 md:block">
            <HeroCluster />
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="mono-label opacity-70">Loading…</div>}>
        <EvalBrowser evals={evals} allTags={allTags} />
      </Suspense>
    </>
  );
}
