import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getEvals,
  getEval,
  getEvalPrompt,
  headerImage,
  repoUrls,
} from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/icons";
import { MarkdownContent } from "@/components/markdown-content";
import { CopyButton } from "@/components/copy-button";
import { SolutionCard } from "@/components/solution-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { EvalArt } from "@/components/eval-art";
import { Globule } from "@/components/globule";
import { globuleForIndex } from "@/lib/globules";
import Link from "next/link";

type Params = { slug: string };

export function generateStaticParams() {
  return getEvals().map((ev) => ({ slug: ev.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ev = getEval(slug);
  if (!ev) return { title: "Not found - galaxy-brain" };
  return {
    title: `${ev.title} - galaxy-brain`,
    description: ev.tagline || ev.description,
  };
}

export default async function EvalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const ev = getEval(slug);
  if (!ev) notFound();

  const colorIndex = getEvals().findIndex((e) => e.slug === ev.slug);
  const globule = globuleForIndex(colorIndex);
  const image = headerImage(ev.slug);
  const urls = repoUrls();
  const promptPath = `${ev.slug}/README.md`;
  const prompt = await getEvalPrompt(ev);

  return (
    <>
      <EvalArt
        globule={globule}
        image={image}
        imageAlt={`${ev.title} header`}
        className="mb-6 h-44 rounded-md border border-ink sm:h-56"
      >
        {!image && (
          <Globule
            globule={globule}
            size={108}
            className="pointer-events-none absolute -top-6 right-6 opacity-95 sm:right-10"
          />
        )}
        <div className="eval-art-scrim" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 sm:p-8">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-paper/80">
              Eval
            </span>
            <h1 className="mt-1.5 font-display text-4xl font-semibold leading-none tracking-tight text-paper drop-shadow-[0_1px_10px_rgba(0,0,0,0.35)] sm:text-5xl">
              {ev.title}
            </h1>
          </div>
          <Button asChild variant="paper" size="sm" className="shrink-0">
            <a
              href={urls.tree(ev.slug)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View this eval's files on GitHub"
            >
              <GithubIcon />
              View on Github
            </a>
          </Button>
        </div>
      </EvalArt>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {(ev.tags || []).map((t) => (
            <Badge key={t} asChild variant="outline">
              <Link href={`/?tags=${encodeURIComponent(t)}`}>{t}</Link>
            </Badge>
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-ink/90">
          {ev.description || ev.tagline || ""}
        </p>
      </header>

      <section className="mb-10 w-full min-w-0 max-w-full">
        <div className="mb-3 flex w-full items-center justify-between border-b border-ink pb-2">
          <h2 className="g-display text-2xl">Solutions</h2>
          <span className="mono-label opacity-70">
            {ev.solutions.length} total
          </span>
        </div>
        {ev.solutions.length === 0 ? (
          <div className="rounded-md border border-ink bg-paper-soft px-4 py-3 text-sm text-ink">
            No solutions submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ev.solutions.map((s) => (
              <SolutionCard key={s.slug} ev={ev} sol={s} globule={globule} />
            ))}
          </div>
        )}
      </section>

      <CollapsibleSection
        title="Prompt"
        meta={<span className="font-mono text-xs text-ink/70">{promptPath}</span>}
      >
        <div className="relative rounded-md border border-ink bg-paper-soft">
          {prompt ? (
            <div className="absolute right-2 top-2 z-10">
              <CopyButton text={prompt.raw} />
            </div>
          ) : null}
          <div className="p-5">
            {prompt ? (
              <MarkdownContent html={prompt.html} />
            ) : (
              <p className="text-ink/90">
                Couldn&apos;t load{" "}
                <code className="rounded border border-paper-3 bg-paper px-1.5 py-0.5 font-mono text-xs">
                  {promptPath}
                </code>
                .{" "}
                <a
                  className="g-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={urls.blob(promptPath)}
                >
                  Open on GitHub.
                </a>
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>
    </>
  );
}
