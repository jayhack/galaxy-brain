import {
  getEvals,
  getAllTags,
  headerImage,
  headerPlaceholder,
} from "@/lib/content";
import { Monogram, HeroCluster } from "@/components/globule";
import { ContentContainer } from "@/components/content-container";
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
    <ContentContainer width="wide">
      <section className="home-hero paper-soft relative mb-6 overflow-hidden border border-ink sm:mb-8">
        <div className="grid grid-cols-12 items-center gap-4 px-4 py-3 sm:gap-6 sm:p-6 md:gap-7 md:p-7">
          <div className="col-span-12 max-w-3xl md:col-span-8">
            <div className="grid max-w-4xl grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-4 md:gap-6">
              <Monogram modifier="logo-monogram--hero" />
              <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1.5">
                <h1 className="hero-title min-w-0 whitespace-nowrap">
                  galaxy-brain
                </h1>
                <p className="hero-subhead text-ink/75">
                  Curated agent evals with submissions
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:col-span-4 md:block">
            <HeroCluster />
          </div>
        </div>
      </section>

      <EvalBrowser evals={evals} allTags={allTags} />
    </ContentContainer>
  );
}
