import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getEvals,
  getSolution,
  getSolutionReadme,
  repoUrls,
  artifactHref,
} from "@/lib/content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { HarnessIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { harnessLogoKind } from "@/lib/globules";
import { MarkdownContent } from "@/components/markdown-content";
import { SolutionRow } from "@/components/solution-row";
import { ArtifactPreview } from "@/components/artifact-preview";
import { CollapsibleSection } from "@/components/collapsible-section";

type Params = { slug: string; solution: string };

export function generateStaticParams() {
  const out: Params[] = [];
  for (const ev of getEvals())
    for (const s of ev.solutions) out.push({ slug: ev.slug, solution: s.slug });
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, solution } = await params;
  const found = getSolution(slug, solution);
  if (!found) return { title: "Not found - galaxy-brain" };
  return {
    title: `${found.sol.slug} - ${found.ev.title} - galaxy-brain`,
    description: found.sol.summary,
  };
}

const kvLabel = "mono-label opacity-75";

export default async function SolutionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, solution } = await params;
  const found = getSolution(slug, solution);
  if (!found) notFound();
  const { ev, sol } = found;

  const urls = repoUrls();
  const dirPath = `${ev.slug}/${sol.slug}`;
  const oc = sol.outcome || {};
  const artifact = artifactHref(sol.artifactUrl);
  const readme = await getSolutionReadme(ev, sol);
  const others = ev.solutions.filter((s) => s.slug !== sol.slug);

  const hasLogo = harnessLogoKind(sol.harness) != null;

  return (
    <>
      <header className="mb-8 flex items-center gap-4">
        {hasLogo ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-ink bg-paper-soft sm:size-14">
            <HarnessIcon harness={sol.harness} className="size-7 sm:size-8" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="break-words font-sans text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {sol.slug}
          </h1>
          <p className="mt-1 font-sans text-sm text-ink/70">{sol.model}</p>
        </div>
      </header>

      <section className="mb-10">
        {artifact ? (
          <ArtifactPreview src={artifact} title={sol.slug} />
        ) : (
          <div className="rounded-md border border-ink bg-paper-soft px-4 py-3 text-sm text-ink">
            No HTML artifact for this solution.{" "}
            <a
              className="g-link"
              target="_blank"
              rel="noopener noreferrer"
              href={urls.tree(dirPath)}
            >
              Browse the source.
            </a>
          </div>
        )}
      </section>

      <CollapsibleSection
        title="README"
        className="mb-10"
        filePath={readme?.path ?? `${dirPath}/README.md`}
        fileHref={urls.blob(readme?.path ?? `${dirPath}/README.md`)}
        copyText={readme?.raw}
      >
        {readme ? (
          <MarkdownContent html={readme.html} />
        ) : (
          <p className="text-ink/90">
            No README found for this solution.{" "}
            <a
              className="g-link"
              target="_blank"
              rel="noopener noreferrer"
              href={urls.tree(dirPath)}
            >
              Browse the directory.
            </a>
          </p>
        )}
      </CollapsibleSection>

      {oc.verdict || oc.score != null || (sol.tech || []).length > 0 || sol.notes ? (
        <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <CardTitle>Outcome</CardTitle>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className={kvLabel}>status</div>
                  <div className="mt-1.5">
                    <StatusBadge status={oc.status} />
                  </div>
                </div>
                <div>
                  <div className={kvLabel}>score</div>
                  <div className="mt-1.5 text-sm">
                    {oc.score == null ? "\u2014" : String(oc.score)}
                  </div>
                </div>
              </div>
              {oc.verdict ? (
                <div className="mt-4">
                  <div className={`${kvLabel} mb-1`}>verdict</div>
                  <p className="text-sm text-ink/85">{oc.verdict}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <CardTitle>Stack</CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(sol.tech || []).length > 0 ? (
                  (sol.tech || []).map((t) => (
                    <Badge key={t} variant="outline" mono>
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink/70">{"\u2014"}</span>
                )}
              </div>
              {sol.notes ? (
                <div className="mt-4">
                  <div className={`${kvLabel} mb-1`}>notes</div>
                  <p className="text-sm text-ink/90">{sol.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mb-10 w-full min-w-0 max-w-full">
        <div className="mb-3 flex w-full items-center justify-between border-b border-ink pb-2">
          <h2 className="g-display text-2xl">Other solutions for this eval</h2>
          <span className="mono-label opacity-70">{others.length} total</span>
        </div>
        {others.length === 0 ? (
          <div className="rounded-md border border-ink bg-paper-soft px-4 py-3 text-sm text-ink">
            No other solutions for this eval.
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {others.map((s) => (
              <SolutionRow key={s.slug} ev={ev} sol={s} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
