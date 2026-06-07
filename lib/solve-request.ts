export const HARNESSES = ["codex", "cursor", "claude"] as const;

export type Harness = (typeof HARNESSES)[number];

export type HarnessConfig = {
  harness: Harness;
  model: string;
  solutionSlug: string;
  promptSuffix?: string;
};

export type SolveWorkflowInput = {
  trackingId?: string;
  evalSlug: string;
  configs: HarnessConfig[];
  dryRun: boolean;
  repoUrl?: string;
  repoOwner?: string;
  repoName?: string;
  baseBranch: string;
  prBaseBranch: string;
  localRepoPath?: string;
  sandboxTimeoutMs: number;
  pollIntervalMs: number;
  maxPolls: number;
};

type RawHarnessConfig = {
  harness?: unknown;
  model?: unknown;
  solutionSlug?: unknown;
  promptSuffix?: unknown;
};

type RawSolveRequest = {
  eval?: unknown;
  evalSlug?: unknown;
  configs?: unknown;
  dryRun?: unknown;
  repoUrl?: unknown;
  baseBranch?: unknown;
  prBaseBranch?: unknown;
  localRepoPath?: unknown;
  sandboxTimeoutMs?: unknown;
  pollIntervalMs?: unknown;
  maxPolls?: unknown;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function requireSlug(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  const slug = slugify(value);
  if (!slug || !slugPattern.test(slug)) {
    throw new Error(`${label} must be lowercase kebab-case`);
  }
  return slug;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  return value;
}

function numberWithDefault(value: unknown, fallback: number, label: string): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return Math.floor(parsed);
}

function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function repoUrlFromEnv(): string | undefined {
  if (process.env.GALAXY_BRAIN_REPO_URL) return process.env.GALAXY_BRAIN_REPO_URL;
  if (process.env.GITHUB_REPOSITORY) {
    return `https://github.com/${process.env.GITHUB_REPOSITORY}.git`;
  }
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  if (owner && repo) return `https://github.com/${owner}/${repo}.git`;
  return undefined;
}

export function parseGithubRepo(repoUrl: string | undefined): {
  owner?: string;
  name?: string;
} {
  if (!repoUrl) return {};

  const httpsMatch = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (httpsMatch) return { owner: httpsMatch[1], name: httpsMatch[2] };

  const sshMatch = repoUrl.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], name: sshMatch[2] };

  return {};
}

function normalizeConfig(config: RawHarnessConfig, index: number): HarnessConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(`configs[${index}] must be an object`);
  }

  if (!HARNESSES.includes(config.harness as Harness)) {
    throw new Error(`configs[${index}].harness must be one of ${HARNESSES.join(", ")}`);
  }
  if (typeof config.model !== "string" || !config.model.trim()) {
    throw new Error(`configs[${index}].model must be a non-empty string`);
  }

  const harness = config.harness as Harness;
  const model = config.model.trim();
  const modelSlug = slugify(model);
  if (!modelSlug) throw new Error(`configs[${index}].model must contain slug characters`);

  const solutionSlug = config.solutionSlug
    ? requireSlug(config.solutionSlug, `configs[${index}].solutionSlug`)
    : `${harness}-${modelSlug}`;

  return {
    harness,
    model,
    solutionSlug,
    promptSuffix: optionalString(config.promptSuffix, `configs[${index}].promptSuffix`),
  };
}

export function normalizeSolveRequest(raw: RawSolveRequest): SolveWorkflowInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("request body must be a JSON object");
  }

  if (!Array.isArray(raw.configs) || raw.configs.length === 0) {
    throw new Error("configs must be a non-empty array");
  }

  const evalSlug = requireSlug(raw.eval ?? raw.evalSlug, "eval");
  const configs = raw.configs.map((config, index) =>
    normalizeConfig(config as RawHarnessConfig, index)
  );
  const dryRun = raw.dryRun === true;
  const repoUrl = optionalString(raw.repoUrl, "repoUrl") ?? repoUrlFromEnv();
  const { owner: repoOwner, name: repoName } = parseGithubRepo(repoUrl);

  const baseBranch =
    optionalString(raw.baseBranch, "baseBranch") ??
    process.env.GALAXY_BRAIN_BASE_BRANCH ??
    "main";
  const prBaseBranch = optionalString(raw.prBaseBranch, "prBaseBranch") ?? baseBranch;
  const sandboxTimeoutMs = numberWithDefault(
    raw.sandboxTimeoutMs,
    envNumber("SOLVER_SANDBOX_TIMEOUT_MS", 7_200_000),
    "sandboxTimeoutMs"
  );
  const pollIntervalMs = numberWithDefault(
    raw.pollIntervalMs,
    envNumber("SOLVER_POLL_INTERVAL_MS", 60_000),
    "pollIntervalMs"
  );
  const maxPolls = numberWithDefault(
    raw.maxPolls,
    Math.max(1, Math.ceil(sandboxTimeoutMs / pollIntervalMs) + 5),
    "maxPolls"
  );

  if (!dryRun && !repoUrl) {
    throw new Error("repoUrl or GALAXY_BRAIN_REPO_URL is required for real runs");
  }

  return {
    evalSlug,
    configs,
    dryRun,
    repoUrl,
    repoOwner,
    repoName,
    baseBranch,
    prBaseBranch,
    localRepoPath:
      optionalString(raw.localRepoPath, "localRepoPath") ??
      process.env.GALAXY_BRAIN_LOCAL_REPO_PATH,
    sandboxTimeoutMs,
    pollIntervalMs,
    maxPolls,
  };
}
