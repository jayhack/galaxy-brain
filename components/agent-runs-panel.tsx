"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GlobuleDot } from "@/components/globule";
import { Badge } from "@/components/ui/badge";
import { HarnessIcon } from "@/components/icons";
import { harnessLogoKind, type Globule } from "@/lib/globules";

type AgentRunJob = {
  tracking_id: string;
  workflow_run_id: string | null;
  eval_slug: string;
  harness: string;
  model: string;
  solution_slug: string;
  status: "queued" | "running" | "dry-run" | "success" | "failed" | "timed-out";
  pull_request_url: string | null;
  created_at: string;
  agent_started_at: string | null;
  agent_completed_at: string | null;
  agent_runs?: {
    status?: string | null;
    created_at?: string | null;
  } | null;
};

type LoadState =
  | { status: "loading"; jobs: AgentRunJob[] }
  | { status: "ready"; jobs: AgentRunJob[] }
  | { status: "error"; jobs: AgentRunJob[] };

const visibleStatuses = new Set(["queued", "running"]);

export function AgentRunsPanel({
  evalSlug,
  mergedSolutionSlugs,
}: {
  evalSlug: string;
  mergedSolutionSlugs: string[];
}) {
  const [state, setState] = useState<LoadState>({ status: "loading", jobs: [] });
  const merged = useMemo(() => new Set(mergedSolutionSlugs), [mergedSolutionSlugs]);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/agent-runs?eval=${encodeURIComponent(evalSlug)}&limit=25`,
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { jobs?: AgentRunJob[] };
        if (!disposed) setState({ status: "ready", jobs: data.jobs ?? [] });
      } catch {
        if (!disposed) setState((current) => ({ status: "error", jobs: current.jobs }));
      }
    }

    void load();
    const interval = window.setInterval(load, 8000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [evalSlug]);

  const jobs = useMemo(() => {
    return state.jobs
      .filter((job) => {
        if (visibleStatuses.has(job.status)) return true;
        return Boolean(
          job.status === "success" &&
            job.pull_request_url &&
            !merged.has(job.solution_slug)
        );
      })
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 3);
  }, [merged, state.jobs]);

  if (state.status === "loading") return <AgentRunsSkeleton />;
  if (state.status === "error" || jobs.length === 0) return null;

  return (
    <section className="mb-10 overflow-hidden rounded-md border border-ink bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <h2 className="g-display text-lg">Agent Runs</h2>
        <span className="mono-label opacity-70">{jobs.length} tracked</span>
      </div>
      <div className="flex flex-col divide-y divide-ink/20">
        {jobs.map((job) => (
          <AgentRunRow key={`${job.tracking_id}:${job.solution_slug}`} job={job} />
        ))}
      </div>
    </section>
  );
}

function AgentRunRow({ job }: { job: AgentRunJob }) {
  const hasIcon = harnessLogoKind(job.harness) != null;
  const short = job.harness.split("-")[0] || job.harness;
  const status = displayStatus(job);
  const href = `/eval/${job.eval_slug}/runs/${job.tracking_id}?solution=${encodeURIComponent(
    job.solution_slug
  )}`;

  return (
    <div className="group flex min-w-0 flex-row items-stretch bg-paper hover:bg-paper-soft">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 no-underline"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-ink bg-paper-soft"
          title={short}
          aria-label={short}
        >
          {hasIcon ? (
            <HarnessIcon harness={job.harness} className="size-5" />
          ) : (
            <span className="font-sans text-[11px] font-semibold uppercase">
              {short.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-sans text-sm font-semibold text-ink">
            {job.solution_slug}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-ink/65">
            {job.workflow_run_id ?? job.tracking_id}
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        <RunStatusBadge status={status} />
        {job.pull_request_url ? (
          <Badge
            asChild
            variant="outline"
            className="gap-1.5 no-underline"
            title="Open PR"
          >
            <a href={job.pull_request_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              PR
            </a>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function AgentRunsSkeleton() {
  return (
    <section className="mb-10 overflow-hidden rounded-md border border-ink bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <div className="h-7 w-36 animate-pulse rounded bg-ink/10" />
        <div className="h-4 w-16 animate-pulse rounded bg-ink/10" />
      </div>
      <div className="flex flex-col divide-y divide-ink/20">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <div className="size-8 shrink-0 animate-pulse rounded-md bg-ink/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-ink/10" />
              <div className="mt-2 h-3 w-32 max-w-full animate-pulse rounded bg-ink/10" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
    </section>
  );
}

function displayStatus(job: AgentRunJob): string {
  if (job.status === "success" && job.pull_request_url) return "submitted";
  return job.status;
}

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 whitespace-nowrap pl-2.5">
      <GlobuleDot globule={statusGlobule(status)} className="shrink-0" />
      {status}
    </Badge>
  );
}

function statusGlobule(status: string): Globule {
  if (status === "running") return { color: "var(--lime)", shade: "var(--lime-d)" };
  if (status === "queued") return { color: "var(--sun)", shade: "var(--sun-d)" };
  if (status === "submitted") return { color: "var(--cobalt)", shade: "var(--cobalt-d)" };
  if (status === "failed" || status === "timed-out") {
    return { color: "var(--magenta)", shade: "var(--magenta-d)" };
  }
  return { color: "var(--paper-3)", shade: "#9a8b5e" };
}
