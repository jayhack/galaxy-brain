import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  getEvals,
  getSolution,
  getSolutionReadme,
  repoUrls,
  artifactHref,
} from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { GithubIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { HarnessModelBadges } from "@/components/harness-model-badges";
import { MarkdownContent } from "@/components/markdown-content";
import { SolutionRow } from "@/components/solution-row";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  const inner = sol.projectName ? `${dirPath}/${sol.projectName}` : dirPath;
  const oc = sol.outcome || {};
  const artifact = artifactHref(sol.artifactUrl);
  const hasArtifact = Boolean(sol.artifactUrl);
  const readme = await getSolutionReadme(ev, sol);
  const others = ev.solutions.filter((s) => s.slug !== sol.slug);

  return (
    <>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Overview</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/eval/${ev.slug}`}>{ev.title}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{sol.slug}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={oc.status} />
          <HarnessModelBadges sol={sol} />
        </div>
        <h1 className="break-words font-mono text-2xl font-bold tracking-tight sm:text-3xl">
          {sol.slug}
        </h1>
        {sol.projectName ? (
          <p className="mt-1 text-ink/90">
            project: <span className="font-mono">{sol.projectName}</span>
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-ink/90">{sol.summary || ""}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {hasArtifact && artifact ? (
            <Button asChild variant="cta" size="sm">
              <a href={artifact} target="_blank" rel="noopener noreferrer">
                Open artifact
              </a>
            </Button>
          ) : null}
          <Button asChild variant={hasArtifact ? "paper" : "ink"} size="sm">
            <a
              href={urls.tree(dirPath)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View this solution's source files on GitHub"
            >
              <GithubIcon />
              View on Github
            </a>
          </Button>
          {artifact ? (
            <Button asChild variant="paper" size="sm">
              <a href={artifact} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Open HTML output
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="sm">
            <a
              href={urls.blob(`${inner}/README.md`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open README
            </a>
          </Button>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <CardTitle>Outcome</CardTitle>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <div className={kvLabel}>status</div>
                <div className="mt-1">
                  <StatusBadge status={oc.status} />
                </div>
              </div>
              <div>
                <div className={kvLabel}>evaluated</div>
                <div className="mt-1 text-sm">{oc.evaluatedAt || "\u2014"}</div>
              </div>
              <div>
                <div className={kvLabel}>score</div>
                <div className="mt-1 text-sm">
                  {oc.score == null ? "\u2014" : String(oc.score)}
                </div>
              </div>
              <div>
                <div className={kvLabel}>harness/model</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <HarnessModelBadges sol={sol} />
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
            <div className="mt-1 flex flex-wrap gap-1.5">
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

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between border-b border-ink pb-2">
          <h2 className="g-display text-2xl">README</h2>
          {readme ? (
            <span className="font-mono text-xs text-ink/70">{readme.path}</span>
          ) : null}
        </div>
        <div className="border border-ink bg-paper p-5">
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
        </div>
      </section>

      <section className="mb-10 w-full min-w-0 max-w-full">
        <div className="mb-3 flex w-full items-center justify-between border-b border-ink pb-2">
          <h2 className="g-display text-2xl">Other solutions for this eval</h2>
          <span className="mono-label opacity-70">{others.length} total</span>
        </div>
        {others.length === 0 ? (
          <div className="border border-ink bg-paper-soft px-4 py-3 text-sm text-ink">
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
