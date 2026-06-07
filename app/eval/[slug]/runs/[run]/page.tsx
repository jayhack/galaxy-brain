import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AgentRunDetail } from "@/components/agent-run-detail";
import { ContentContainer } from "@/components/content-container";
import { getEval } from "@/lib/content";

type Params = { slug: string; run: string };

export const dynamic = "force-dynamic";

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
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ solution?: string }>;
}) {
  const { slug, run } = await params;
  const { solution } = await searchParams;
  const ev = getEval(slug);
  if (!ev) notFound();

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

      <AgentRunDetail runId={run} initialSolution={solution} />
    </ContentContainer>
  );
}
