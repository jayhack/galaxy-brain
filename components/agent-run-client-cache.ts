"use client";

type CachedRun = {
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

type CachedJob = {
  id: string;
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

export type CachedAgentRunDetail = {
  evalSlug: string;
  evalTitle: string;
  runId: string;
  selectedJobId: string | null;
  run: CachedRun;
  jobs: CachedJob[];
  expiresAt: number;
};

const prefix = "galaxy-brain:agent-run-detail:";
const ttlMs = 60_000;

export function cacheAgentRunDetail(detail: Omit<CachedAgentRunDetail, "expiresAt">) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${prefix}${detail.runId}`,
      JSON.stringify({ ...detail, expiresAt: Date.now() + ttlMs })
    );
  } catch {
    // Cache is a navigation hint only.
  }
}

export function readCachedAgentRunDetail(runId: string): CachedAgentRunDetail | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`${prefix}${runId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAgentRunDetail;
    if (!parsed || parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(`${prefix}${runId}`);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
