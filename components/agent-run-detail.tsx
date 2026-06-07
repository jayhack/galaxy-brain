"use client";

import { ChevronDown, Clock, ExternalLink, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { GlobuleDot } from "@/components/globule";
import { Badge } from "@/components/ui/badge";
import { HarnessIcon } from "@/components/icons";
import { harnessLogoKind, type Globule } from "@/lib/globules";

type AgentRun = {
  tracking_id: string;
  workflow_run_id: string | null;
  eval_slug: string;
  status: string;
  dry_run: boolean;
  started_at: string | null;
  completed_at: string | null;
  elapsed_ms: number | null;
  error_message: string | null;
};

type AgentRunJob = {
  tracking_id: string;
  workflow_run_id: string | null;
  eval_slug: string;
  harness: string;
  model: string;
  solution_slug: string;
  status: string;
  branch_name: string | null;
  pull_request_url: string | null;
  files: string[];
  agent_started_at: string | null;
  agent_completed_at: string | null;
  elapsed_ms: number | null;
  error_message: string | null;
};

type AgentRunEvent = {
  id: number;
  event_type: string;
  stream: "stdout" | "stderr" | null;
  message: string;
  solution_slug: string | null;
  created_at: string;
};

type RunDetail =
  | { status: "loading"; run: null; jobs: AgentRunJob[]; error?: string }
  | { status: "ready"; run: AgentRun; jobs: AgentRunJob[]; error?: string }
  | { status: "error"; run: null; jobs: AgentRunJob[]; error: string };

type MergedSolution = {
  slug: string;
  submittedAt?: string | null;
};

export function AgentRunDetail({
  runId,
  initialSolution,
  mergedSolutions = [],
}: {
  runId: string;
  initialSolution?: string;
  mergedSolutions?: MergedSolution[];
}) {
  const [detail, setDetail] = useState<RunDetail>({
    status: "loading",
    run: null,
    jobs: [],
  });
  const [selectedSolution, setSelectedSolution] = useState(initialSolution ?? "");
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;

    async function loadDetail() {
      try {
        const response = await fetch(`/api/agent-runs/${encodeURIComponent(runId)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as {
          run: AgentRun;
          jobs: AgentRunJob[];
        };
        if (!disposed) {
          setDetail({ status: "ready", run: data.run, jobs: data.jobs ?? [] });
        }
      } catch (error) {
        if (!disposed) {
          setDetail({
            status: "error",
            run: null,
            jobs: [],
            error: error instanceof Error ? error.message : "Run lookup failed",
          });
        }
      }
    }

    void loadDetail();
    const interval = window.setInterval(loadDetail, 5000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [runId]);

  useEffect(() => {
    if (selectedSolution || detail.jobs.length === 0) return;
    setSelectedSolution(detail.jobs[0].solution_slug);
  }, [detail.jobs, selectedSolution]);

  useEffect(() => {
    let disposed = false;

    async function loadEvents() {
      const params = new URLSearchParams({ limit: "500" });
      if (selectedSolution) params.set("solution", selectedSolution);

      try {
        const response = await fetch(
          `/api/agent-runs/${encodeURIComponent(runId)}/events?${params}`,
          { cache: "no-store" }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { events?: AgentRunEvent[] };
        if (!disposed) setEvents(data.events ?? []);
      } catch {
        if (!disposed) setEvents([]);
      }
    }

    void loadEvents();
    const interval = window.setInterval(loadEvents, 2500);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [runId, selectedSolution]);

  useEffect(() => {
    const node = terminalRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [events]);

  const selectedJob = useMemo(() => {
    return (
      detail.jobs.find((job) => job.solution_slug === selectedSolution) ??
      detail.jobs[0] ??
      null
    );
  }, [detail.jobs, selectedSolution]);
  const merged = useMemo(() => {
    return new Map(mergedSolutions.map((solution) => [solution.slug, solution]));
  }, [mergedSolutions]);

  const activeStatus =
    detail.status === "ready" ? selectedJob?.status ?? detail.run.status : "";

  useEffect(() => {
    if (!isActiveStatus(activeStatus)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeStatus]);

  if (detail.status === "loading") return <RunDetailSkeleton />;
  if (detail.status === "error") {
    return (
      <div className="rounded-md border border-ink bg-paper-soft px-4 py-3 text-sm text-ink">
        {detail.error}
      </div>
    );
  }

  const selectedMerged = selectedJob ? merged.get(selectedJob.solution_slug) ?? null : null;
  const selectedStatus = displayStatus(selectedJob, detail.run.status, selectedMerged);
  const runIdentifier =
    selectedJob?.workflow_run_id ??
    detail.run.workflow_run_id ??
    selectedJob?.tracking_id ??
    detail.run.tracking_id ??
    runId;
  const elapsed = formatElapsed(elapsedForRun(detail.run, selectedJob, selectedStatus, now));
  const hasIcon = harnessLogoKind(selectedJob?.harness) != null;
  const short = selectedJob?.harness.split("-")[0] || selectedJob?.harness || "agent";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {selectedJob ? (
            <span
              className="flex size-[50px] shrink-0 items-center justify-center rounded-md border border-ink bg-paper-soft sm:size-[58px]"
              title={short}
              aria-label={short}
            >
              {hasIcon ? (
                <HarnessIcon harness={selectedJob.harness} className="size-[58%]" />
              ) : (
                <span className="font-sans text-sm font-semibold uppercase">
                  {short.slice(0, 2)}
                </span>
              )}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="break-words font-sans text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {selectedJob?.solution_slug ?? "agent run"}
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-ink/65 sm:text-sm">
              {runIdentifier}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink/75">
            <Clock className="size-3.5" aria-hidden />
            {elapsed}
          </span>
          <RunStatusBadge status={selectedStatus} />
        </div>
      </header>

      {detail.jobs.length > 1 ? (
        <section className="flex flex-wrap gap-2 rounded-md border border-ink bg-paper px-4 py-3">
          {detail.jobs.map((job) => (
            <button
              key={job.solution_slug}
              type="button"
              onClick={() => setSelectedSolution(job.solution_slug)}
              className={`rounded-md border px-3 py-1.5 font-sans text-xs font-semibold ${
                job.solution_slug === selectedJob?.solution_slug
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/30 bg-paper-soft text-ink hover:border-ink"
              }`}
            >
              {job.solution_slug}
            </button>
          ))}
        </section>
      ) : null}

      {selectedJob ? <SolutionSection job={selectedJob} /> : null}

      <section className="overflow-hidden rounded-md border border-ink bg-ink text-paper">
        <div className="flex items-center justify-between gap-3 border-b border-paper/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-[0.12em]">
            <Terminal className="size-4" />
            Terminal
          </h2>
          <span className="font-mono text-[11px] text-paper/55">{events.length} events</span>
        </div>
        <div
          ref={terminalRef}
          className="max-h-[62vh] min-h-[360px] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed"
        >
          {events.length === 0 ? (
            <div className="py-8 text-paper/55">No terminal output yet.</div>
          ) : (
            events.map((event) => <TerminalEvent key={event.id} event={event} />)
          )}
        </div>
      </section>

    </div>
  );
}

function RunDetailSkeleton() {
  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4">
        <div className="size-12 shrink-0 animate-pulse rounded-md bg-ink/10 sm:size-14" />
        <div className="min-w-0 flex-1">
          <div className="h-7 w-72 max-w-full animate-pulse rounded bg-ink/10" />
          <div className="mt-2 h-4 w-36 animate-pulse rounded bg-ink/10" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded bg-ink/10" />
        </div>
        <div className="hidden h-7 w-24 animate-pulse rounded-full bg-ink/10 sm:block" />
      </section>
      <section className="min-h-[420px] rounded-md border border-ink bg-ink p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-paper/15" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-3 animate-pulse rounded bg-paper/10" />
          ))}
        </div>
      </section>
    </div>
  );
}

function SolutionSection({ job }: { job: AgentRunJob }) {
  return (
    <details className="section overflow-hidden rounded-md border border-ink bg-paper">
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 border-b border-ink bg-paper-3 px-5 py-3">
        <span className="flex min-w-0 shrink-0 items-center gap-2">
          <ChevronDown
            className="section-chevron size-4 shrink-0 text-ink/70"
            aria-hidden
          />
          <span className="g-display text-lg">Solution</span>
        </span>
        {job.pull_request_url ? <PrBadge href={job.pull_request_url} /> : null}
      </summary>
      {job.files.length > 0 ? (
        <div className="divide-y divide-ink/20">
          {job.files.map((file) => (
            <div key={file} className="px-5 py-2.5 font-mono text-xs text-ink/80">
              {file}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-ink/70">No solution files captured yet.</div>
      )}
    </details>
  );
}

function TerminalEvent({ event }: { event: AgentRunEvent }) {
  if (event.event_type === "agent_log") {
    return (
      <pre
        className={`whitespace-pre-wrap break-words ${
          event.stream === "stderr" ? "text-[var(--magenta)]" : "text-paper/90"
        }`}
      >
        {event.message}
      </pre>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words text-paper/50">
      [{formatTime(event.created_at)}] {event.event_type}
      {event.solution_slug ? `:${event.solution_slug}` : ""} {event.message}
    </div>
  );
}

function PrBadge({ href }: { href: string }) {
  return (
    <Badge asChild variant="outline" className="gap-1.5 no-underline" title="Open PR">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        <ExternalLink className="size-3.5" />
        PR
      </a>
    </Badge>
  );
}

function displayStatus(
  job: AgentRunJob | null,
  runStatus: string,
  mergedSolution: MergedSolution | null
): string {
  if (job?.status === "success" && job.pull_request_url && mergedSolution) {
    return "merged";
  }
  if (job?.status === "success" && job.pull_request_url) return "submitted";
  return job?.status ?? runStatus;
}

function RunStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 whitespace-nowrap bg-paper pl-2.5">
      <GlobuleDot globule={statusGlobule(status)} className="shrink-0" />
      {status}
    </Badge>
  );
}

function statusGlobule(status: string): Globule {
  if (status === "running" || status === "completed") {
    return { color: "var(--lime)", shade: "var(--lime-d)" };
  }
  if (status === "queued" || status === "partial") {
    return { color: "var(--sun)", shade: "var(--sun-d)" };
  }
  if (status === "submitted" || status === "success" || status === "dry-run") {
    return { color: "var(--cobalt)", shade: "var(--cobalt-d)" };
  }
  if (status === "merged") return { color: "var(--lime)", shade: "var(--lime-d)" };
  if (status === "failed" || status === "timed-out") {
    return { color: "var(--magenta)", shade: "var(--magenta-d)" };
  }
  return { color: "var(--paper-3)", shade: "#9a8b5e" };
}

function isActiveStatus(status: string): boolean {
  return status === "running";
}

function elapsedForRun(
  run: AgentRun,
  job: AgentRunJob | null,
  status: string,
  now: number
): number | null {
  const startedAt = job?.agent_started_at ?? run.started_at;
  if (isActiveStatus(status)) {
    return elapsedBetween(startedAt, now) ?? job?.elapsed_ms ?? run.elapsed_ms;
  }

  const stored = job?.elapsed_ms ?? run.elapsed_ms;
  if (Number.isFinite(stored ?? NaN)) return stored ?? null;

  const completedAt = job?.agent_completed_at ?? run.completed_at;
  if (!completedAt) return null;
  return elapsedBetween(startedAt, Date.parse(completedAt));
}

function elapsedBetween(start: string | null | undefined, endMs: number): number | null {
  if (!start) return null;
  const startMs = Date.parse(start);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, endMs - startMs);
}

function formatElapsed(ms: number | null | undefined): string {
  if (!Number.isFinite(ms ?? NaN)) return "-";
  const seconds = Math.round((ms ?? 0) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m${remainder.toString().padStart(2, "0")}s`;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
