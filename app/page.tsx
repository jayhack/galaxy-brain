import {
  getEvals,
  getAllTags,
  headerImage,
  headerPlaceholder,
} from "@/lib/content";
import { Monogram, HeroCluster } from "@/components/globule";
import { EvalBrowser } from "@/components/eval-browser";
import type { EvalCardData } from "@/components/eval-card";

export default function HomePage() {
  const evals: EvalCardData[] = getEvals().map((ev, i) => ({
    slug: ev.slug,
    title: ev.title,
    tagline: ev.tagline,
    description: ev.description,
    tags: ev.tags || [],
    count: ev.solutions.length,
    colorIndex: i,
    image: headerImage(ev.slug),
    placeholder: headerPlaceholder(ev.slug),
  }));
  const allTags = getAllTags();

  return (
    <>
      <section className="paper-soft relative mb-8 overflow-hidden border border-ink">
        <div className="grid grid-cols-12 items-center gap-6 p-6 sm:gap-7 sm:p-7">
          <div className="col-span-12 max-w-3xl md:col-span-8">
            <div className="grid max-w-4xl grid-cols-[auto_minmax(0,1fr)] items-center gap-4 md:gap-6">
              <Monogram modifier="logo-monogram--hero" />
              <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
                <h1 className="hero-title min-w-0">
                  curated agent evals with submissions
                </h1>
                <p className="lede max-w-xl text-base leading-snug text-ink/75 sm:text-lg">
                  Each eval is a prompt; each solution is one harness/model
                  pair&apos;s attempt.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-center md:hidden">
              <HeroCluster compact />
            </div>
          </div>
          <div className="hidden md:col-span-4 md:block">
            <HeroCluster />
          </div>
        </div>
      </section>

      <EvalBrowser evals={evals} allTags={allTags} />
    </>
  );
}
