import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AgentRunDetail } from "@/components/agent-run-detail";
import { ContentContainer } from "@/components/content-container";
import { getEval } from "@/lib/content";
import { getRunWithJobs, isRunStoreConfigured } from "@/lib/run-store";

type Params = { slug: string; run: string };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, run } = await params;
  const ev = getEval(slug);
  if (!ev) return { title: "Not found - galaxy-brain" };
  return {
    title: `${ev.title} agent run - galaxy-brain`,
    description: `Agent run ${run} for ${ev.title}`,
  };
}

export default async function AgentRunPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, run } = await params;
  const ev = getEval(slug);
  if (!ev) notFound();

  const requestHeaders = await headers();
  const isClientNavigation = requestHeaders.get("rsc") === "1";
  const shouldLoadInitialDetail = isRunStoreConfigured() && !isClientNavigation;
  const initialDetail = shouldLoadInitialDetail ? await getRunWithJobs(run) : null;

  if (shouldLoadInitialDetail && (!initialDetail || initialDetail.run.eval_slug !== ev.slug)) {
    notFound();
  }

  return (
    <ContentContainer>
      <header className="mb-8">
        <Link
          href={`/eval/${ev.slug}`}
          className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-ink no-underline hover:underline"
        >
          <ArrowLeft className="size-4" />
          {ev.title}
        </Link>
      </header>

      <AgentRunDetail
        runId={run}
        initialDetail={initialDetail ?? undefined}
        mergedSolutions={ev.solutions.map((solution) => ({
          slug: solution.slug,
          submittedAt: solution.submittedAt ?? null,
        }))}
      />
    </ContentContainer>
  );
}
