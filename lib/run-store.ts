import type { HarnessConfig, SolveWorkflowInput } from "@/lib/solve-request";

type JsonObject = Record<string, unknown>;

export type AgentRunRecord = {
  id: string;
  tracking_id: string;
  workflow_run_id: string | null;
  eval_slug: string;
  dry_run: boolean;
  repo_url: string | null;
  base_branch: string;
  pr_base_branch: string;
  status: "queued" | "running" | "completed" | "failed" | "partial";
  started_at: string | null;
  completed_at: string | null;
  elapsed_ms: number | null;
  error_message: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
};

export type AgentRunJobRecord = {
  id: string;
  tracking_id: string;
  workflow_run_id: string | null;
  eval_slug: string;
  harness: string;
  model: string;
  solution_slug: string;
  status: "queued" | "running" | "dry-run" | "success" | "failed" | "timed-out";
  sandbox_id: string | null;
  command_id: string | null;
  branch_name: string | null;
  pull_request_url: string | null;
  pull_request_number: number | null;
  files: string[];
  usage: JsonObject;
  cost_usd: string | null;
  agent_started_at: string | null;
  agent_completed_at: string | null;
  elapsed_ms: number | null;
  exit_code: number | null;
  error_message: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
};

export type AgentRunJobWithRun = AgentRunJobRecord & {
  agent_runs?: AgentRunRecord | null;
};

type StartedJob = {
  sandboxName: string;
  commandId: string;
  branchName: string;
  startedAt: string;
};

type CompletedJob = {
  branchName?: string;
  pullRequestUrl?: string;
  files?: string[];
  exitCode?: number | null;
  agentStartedAt?: string;
  output?: string;
};

type FailedJob = {
  message: string;
  exitCode?: number | null;
  agentStartedAt?: string;
};

type ListFilters = {
  evalSlug?: string;
  harness?: string;
  model?: string;
  status?: string;
  q?: string;
  limit?: number;
};

const maxLimit = 100;

export function isRunStoreConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createPendingRunRecord(
  input: SolveWorkflowInput,
  trackingId: string
): Promise<void> {
  await writeBestEffort("createPendingRunRecord", async () => {
    await upsert("agent_runs", "tracking_id", {
      tracking_id: trackingId,
      eval_slug: input.evalSlug,
      dry_run: input.dryRun,
      repo_url: input.repoUrl ?? null,
      base_branch: input.baseBranch,
      pr_base_branch: input.prBaseBranch,
      status: "queued",
      metadata: {
        sandboxTimeoutMs: input.sandboxTimeoutMs,
        pollIntervalMs: input.pollIntervalMs,
        maxPolls: input.maxPolls,
        configs: input.configs.map((config) => ({
          harness: config.harness,
          model: config.model,
          solutionSlug: config.solutionSlug,
        })),
      },
    });

    await upsert(
      "agent_run_jobs",
      "tracking_id,solution_slug",
      input.configs.map((config) => ({
        tracking_id: trackingId,
        eval_slug: input.evalSlug,
        harness: config.harness,
        model: config.model,
        solution_slug: config.solutionSlug,
        status: "queued",
      }))
    );
  });
}

export async function attachWorkflowRunId(
  trackingId: string | undefined,
  workflowRunId: string
): Promise<void> {
  if (!trackingId) return;
  await writeBestEffort("attachWorkflowRunId", async () => {
    await patch("agent_runs", `tracking_id=eq.${encodeURIComponent(trackingId)}`, {
      workflow_run_id: workflowRunId,
      status: "running",
      started_at: new Date().toISOString(),
    });
    await patch("agent_run_jobs", `tracking_id=eq.${encodeURIComponent(trackingId)}`, {
      workflow_run_id: workflowRunId,
    });
  });
}

export async function markWorkflowStarted(input: SolveWorkflowInput): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markWorkflowStarted", async () => {
    await patch("agent_runs", `tracking_id=eq.${encodeURIComponent(input.trackingId!)}`, {
      status: "running",
      started_at: new Date().toISOString(),
    });
  });
}

export async function markDryRunCompleted(
  input: SolveWorkflowInput,
  config: HarnessConfig
): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markDryRunCompleted", async () => {
    const completedAt = new Date().toISOString();
    await patch(
      "agent_run_jobs",
      jobFilter(input.trackingId!, config.solutionSlug),
      {
        status: "dry-run",
        agent_completed_at: completedAt,
      }
    );
  });
}

export async function markJobStarted(
  input: SolveWorkflowInput,
  config: HarnessConfig,
  started: StartedJob
): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markJobStarted", async () => {
    await upsert("agent_run_jobs", "tracking_id,solution_slug", {
      tracking_id: input.trackingId,
      eval_slug: input.evalSlug,
      harness: config.harness,
      model: config.model,
      solution_slug: config.solutionSlug,
      status: "running",
      sandbox_id: started.sandboxName,
      command_id: started.commandId,
      branch_name: started.branchName,
      agent_started_at: started.startedAt,
    });
  });
}

export async function markJobCompleted(
  input: SolveWorkflowInput,
  config: HarnessConfig,
  completed: CompletedJob
): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markJobCompleted", async () => {
    const completedAt = new Date().toISOString();
    const usage = parseUsage(completed.output);
    const startedAt = completed.agentStartedAt;
    await patch(
      "agent_run_jobs",
      jobFilter(input.trackingId!, config.solutionSlug),
      {
        status: "success",
        branch_name: completed.branchName ?? null,
        pull_request_url: completed.pullRequestUrl ?? null,
        pull_request_number: parsePullRequestNumber(completed.pullRequestUrl),
        files: completed.files ?? [],
        usage,
        cost_usd: estimateCostUsd(usage, config.model),
        agent_completed_at: completedAt,
        elapsed_ms: startedAt ? elapsedMs(startedAt, completedAt) : null,
        exit_code: completed.exitCode ?? 0,
      }
    );
  });
}

export async function markJobFailed(
  input: SolveWorkflowInput,
  config: HarnessConfig,
  failed: FailedJob
): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markJobFailed", async () => {
    const completedAt = new Date().toISOString();
    await patch(
      "agent_run_jobs",
      jobFilter(input.trackingId!, config.solutionSlug),
      {
        status: failed.message.toLowerCase().includes("timed out") ? "timed-out" : "failed",
        agent_completed_at: completedAt,
        elapsed_ms: failed.agentStartedAt ? elapsedMs(failed.agentStartedAt, completedAt) : null,
        exit_code: failed.exitCode ?? null,
        error_message: failed.message,
      }
    );
  });
}

export async function markWorkflowFinished(
  input: SolveWorkflowInput,
  results: Array<{ status: string; message?: string }>
): Promise<void> {
  if (!input.trackingId) return;
  await writeBestEffort("markWorkflowFinished", async () => {
    const completedAt = new Date().toISOString();
    const status = results.every((result) => result.status !== "failed")
      ? "completed"
      : results.some((result) => result.status === "success" || result.status === "dry-run")
        ? "partial"
        : "failed";
    const run = await getRunByTrackingId(input.trackingId!);
    await patch("agent_runs", `tracking_id=eq.${encodeURIComponent(input.trackingId!)}`, {
      status,
      completed_at: completedAt,
      elapsed_ms: run?.started_at ? elapsedMs(run.started_at, completedAt) : null,
      error_message:
        status === "failed"
          ? results.find((result) => result.message)?.message ?? "All solve jobs failed"
          : null,
    });
  });
}

export async function listRunJobs(filters: ListFilters): Promise<AgentRunJobWithRun[]> {
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), maxLimit);
  const params = new URLSearchParams({
    select: "*,agent_runs(*)",
    order: "created_at.desc",
    limit: String(limit),
  });

  if (filters.evalSlug) params.set("eval_slug", `eq.${filters.evalSlug}`);
  if (filters.harness) params.set("harness", `eq.${filters.harness}`);
  if (filters.model) params.set("model", `eq.${filters.model}`);
  if (filters.status) params.set("status", `eq.${filters.status}`);
  if (filters.q) {
    const pattern = `*${filters.q.replaceAll("*", "")}*`;
    params.set(
      "or",
      [
        `eval_slug.ilike.${pattern}`,
        `solution_slug.ilike.${pattern}`,
        `harness.ilike.${pattern}`,
        `model.ilike.${pattern}`,
        `branch_name.ilike.${pattern}`,
        `pull_request_url.ilike.${pattern}`,
      ].join(",")
    );
  }

  return supabaseRequest<AgentRunJobWithRun[]>(`/rest/v1/agent_run_jobs?${params}`);
}

export async function getRunWithJobs(id: string): Promise<
  | {
      run: AgentRunRecord;
      jobs: AgentRunJobRecord[];
    }
  | null
> {
  const run = await getRunByTrackingId(id) ?? (await getRunByWorkflowRunId(id));
  if (!run) return null;

  const params = new URLSearchParams({
    tracking_id: `eq.${run.tracking_id}`,
    order: "created_at.asc",
    select: "*",
  });
  const jobs = await supabaseRequest<AgentRunJobRecord[]>(`/rest/v1/agent_run_jobs?${params}`);
  return { run, jobs };
}

async function getRunByTrackingId(trackingId: string): Promise<AgentRunRecord | null> {
  if (!isUuid(trackingId)) return null;
  const params = new URLSearchParams({
    tracking_id: `eq.${trackingId}`,
    limit: "1",
    select: "*",
  });
  const rows = await supabaseRequest<AgentRunRecord[]>(`/rest/v1/agent_runs?${params}`);
  return rows[0] ?? null;
}

async function getRunByWorkflowRunId(workflowRunId: string): Promise<AgentRunRecord | null> {
  const params = new URLSearchParams({
    workflow_run_id: `eq.${workflowRunId}`,
    limit: "1",
    select: "*",
  });
  const rows = await supabaseRequest<AgentRunRecord[]>(`/rest/v1/agent_runs?${params}`);
  return rows[0] ?? null;
}

async function upsert(table: string, onConflict: string, body: unknown): Promise<void> {
  await supabaseRequest(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function patch(table: string, filter: string, body: unknown): Promise<void> {
  await supabaseRequest(`/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

async function supabaseRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase run store is not configured");
  }

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${init.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function writeBestEffort(label: string, fn: () => Promise<void>): Promise<void> {
  if (!isRunStoreConfigured()) return;
  try {
    await fn();
  } catch (error) {
    console.warn(`[run-store] ${label} failed`, error);
  }
}

function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function jobFilter(trackingId: string, solutionSlug: string): string {
  return `tracking_id=eq.${encodeURIComponent(trackingId)}&solution_slug=eq.${encodeURIComponent(
    solutionSlug
  )}`;
}

function parsePullRequestNumber(url: string | undefined): number | null {
  if (!url) return null;
  const match = url.match(/\/pull\/(\d+)(?:$|[/?#])/);
  return match ? Number(match[1]) : null;
}

function parseUsage(output: string | undefined): JsonObject {
  if (!output) return {};

  const tokenMatch = output.match(/tokens used\s*\n?\s*([\d,]+)/i);
  const totalTokens = tokenMatch ? Number(tokenMatch[1].replaceAll(",", "")) : undefined;
  return {
    ...(totalTokens ? { totalTokens } : {}),
  };
}

function estimateCostUsd(usage: JsonObject, model: string): number | null {
  const tokenPrice = process.env[`SOLVER_COST_USD_PER_1M_TOKENS_${slugEnv(model)}`]
    ?? process.env.SOLVER_COST_USD_PER_1M_TOKENS;
  const totalTokens = typeof usage.totalTokens === "number" ? usage.totalTokens : undefined;
  if (!tokenPrice || !totalTokens) return null;

  const price = Number(tokenPrice);
  if (!Number.isFinite(price) || price < 0) return null;
  return Number(((totalTokens / 1_000_000) * price).toFixed(6));
}

function slugEnv(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function elapsedMs(start: string, end: string): number | null {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, endMs - startMs);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
