#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const harnesses = new Set(["codex", "cursor", "claude"]);
const defaultApiUrl = "http://127.0.0.1:3000";
const defaultHarness = "codex";
const defaultModel = "gpt-5.4-mini";

loadEnvFile(".env.local");
loadEnvFile(".env");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "run") {
    await runCommand(args);
    return;
  }

  if (command === "runs") {
    await runsCommand(args);
    return;
  }

  if (command === "run-info") {
    await runInfoCommand(args);
    return;
  }

  if (command === "status") {
    await statusCommand(args);
    return;
  }

  if (command === "events") {
    await eventsCommand(args);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\nRun gx --help for usage.`);
}

function printHelp() {
  console.log(`Usage:
  gx run <eval-slug> [options]
  gx runs [options]
  gx run-info <tracking-id|workflow-run-id> [--api-url <url>]
  gx status <run-id> [--api-url <url>]
  gx events <run-id> [--api-url <url>]

Examples:
  gx run porsche-render
  gx run porsche-render --dry-run
  gx run porsche-render --model gpt-5.4-mini
  gx run evading-demons --config codex:gpt-5.4-mini --config claude:sonnet-4.5
  gx runs --eval fishtank-water-sim --model gpt-5.4-mini
  gx run-info wrun_...

Run options:
  --harness <codex|cursor|claude>       Harness for the default single config.
  --model <model>                       Model for the default single config.
  --solution <slug>                     Explicit solution slug for the default config.
  --solution-slug <slug>                Alias for --solution.
  --config <harness:model[:solution]>   Add a config. Repeat for fan-out.
  --prompt-suffix <text>                Extra instruction appended to the agent prompt.
  --prompt-suffix-file <path>           Read extra prompt text from a file.
  --dry-run                             Build prompts without creating sandboxes.
  --repo-url <url>                      Repo URL for real runs. Defaults to .env.
  --local-repo-path <path>              Prompt source for dry runs. Defaults to this repo.
  --base-branch <branch>                Branch cloned inside the sandbox.
  --pr-base-branch <branch>             PR target branch. Defaults to base branch.
  --sandbox-timeout-ms <ms>             Sandbox timeout override.
  --poll-interval-ms <ms>               Workflow poll interval override.
  --max-polls <count>                   Workflow poll count override.
  --api-url <url>                       Next app URL. Defaults to ${defaultApiUrl}.
  --no-stream                           Start the run and exit after printing run id.
  --json                                Print the start response as JSON.

Local notes:
  Start the app with npm run dev, and optionally run npx workflow web in another
  terminal for the Workflow dashboard. The local Next process reads .env; gx also
  reads .env for request defaults and preflight checks, but it never sends secrets
  in the solve request.`);
}

async function runCommand(args) {
  const options = parseRunArgs(args);
  const apiUrl = normalizeApiUrl(options.apiUrl);
  const body = buildSolveBody(options);

  if (!options.dryRun) {
    warnAboutMissingSecrets(body.configs);
  }

  if (!options.json) {
    console.log(`Starting solve workflow at ${apiUrl}`);
    console.log(`Eval: ${body.eval}`);
    console.log(
      `Configs: ${body.configs
        .map((config) => `${config.harness}:${config.model}`)
        .join(", ")}`
    );
    if (body.dryRun) console.log("Mode: dry run");
  }

  const response = await postJson(`${apiUrl}/api/solve`, body);

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    console.log(`Run id: ${response.runId}`);
  }

  if (options.stream !== false && response.runId) {
    await streamEvents(apiUrl, response.runId, { showPrompt: options.showPrompt });
  }
}

async function statusCommand(args) {
  const { runId, apiUrl, json } = parseRunIdArgs(args, "status");
  const response = await getJson(`${normalizeApiUrl(apiUrl)}/api/runs/${runId}`);
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  console.log(`${response.runId}: ${response.status}`);
  if (response.startedAt) console.log(`Started: ${response.startedAt}`);
  if (response.completedAt) console.log(`Completed: ${response.completedAt}`);
}

async function runsCommand(args) {
  const options = parseRunsArgs(args);
  const apiUrl = normalizeApiUrl(options.apiUrl);
  const params = new URLSearchParams();
  if (options.evalSlug) params.set("eval", options.evalSlug);
  if (options.harness) params.set("harness", options.harness);
  if (options.model) params.set("model", options.model);
  if (options.status) params.set("status", options.status);
  if (options.q) params.set("q", options.q);
  if (options.limit) params.set("limit", String(options.limit));

  const suffix = params.size ? `?${params}` : "";
  const response = await getJson(`${apiUrl}/api/agent-runs${suffix}`);
  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  const jobs = response.jobs ?? [];
  if (jobs.length === 0) {
    console.log("No tracked agent runs found.");
    return;
  }

  for (const job of jobs) {
    const run = job.agent_runs ?? {};
    const elapsed = formatElapsed(job.elapsed_ms ?? run.elapsed_ms);
    const pr = job.pull_request_url ? ` ${job.pull_request_url}` : "";
    console.log(
      `${job.created_at} ${job.status.padEnd(9)} ${job.eval_slug}/${job.solution_slug} ${job.harness}:${job.model} ${elapsed}${pr}`
    );
  }
}

async function runInfoCommand(args) {
  const { runId, apiUrl, json } = parseRunIdArgs(args, "run-info");
  const response = await getJson(`${normalizeApiUrl(apiUrl)}/api/agent-runs/${runId}`);
  if (json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  const { run, jobs } = response;
  console.log(`${run.workflow_run_id ?? run.tracking_id}: ${run.status}`);
  console.log(`Eval: ${run.eval_slug}`);
  console.log(`Dry run: ${run.dry_run}`);
  if (run.started_at) console.log(`Started: ${run.started_at}`);
  if (run.completed_at) console.log(`Completed: ${run.completed_at}`);
  if (run.elapsed_ms) console.log(`Elapsed: ${formatElapsed(run.elapsed_ms)}`);
  if (run.error_message) console.log(`Error: ${run.error_message}`);

  for (const job of jobs ?? []) {
    console.log("");
    console.log(`${job.solution_slug}: ${job.status} (${job.harness}:${job.model})`);
    if (job.branch_name) console.log(`Branch: ${job.branch_name}`);
    if (job.pull_request_url) console.log(`PR: ${job.pull_request_url}`);
    if (job.elapsed_ms) console.log(`Elapsed: ${formatElapsed(job.elapsed_ms)}`);
    if (job.cost_usd) console.log(`Cost: $${job.cost_usd}`);
    if (job.error_message) console.log(`Error: ${job.error_message}`);
    if (Array.isArray(job.files) && job.files.length > 0) {
      console.log("Files:");
      for (const file of job.files) console.log(`  ${file}`);
    }
  }
}

async function eventsCommand(args) {
  const { runId, apiUrl } = parseRunIdArgs(args, "events");
  await streamEvents(normalizeApiUrl(apiUrl), runId, { showPrompt: true });
}

function parseRunsArgs(args) {
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const options = {
    apiUrl: process.env.GX_API_URL ?? process.env.SOLVER_API_URL ?? defaultApiUrl,
    json: false,
    limit: 25,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--api-url") options.apiUrl = value;
    else if (arg === "--eval") options.evalSlug = value;
    else if (arg === "--harness") options.harness = value;
    else if (arg === "--model") options.model = value;
    else if (arg === "--status") options.status = value;
    else if (arg === "--q") options.q = value;
    else if (arg === "--limit") options.limit = parsePositiveInt(value, arg);
    else throw new Error(`Unknown option: ${arg}`);

    index += 1;
  }

  return options;
}

function parseRunArgs(args) {
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const [evalSlug, ...rest] = args;
  if (!evalSlug || evalSlug.startsWith("-")) {
    throw new Error("Usage: gx run <eval-slug> [options]");
  }

  const options = {
    evalSlug,
    harness: defaultHarness,
    model: defaultModel,
    configs: [],
    dryRun: false,
    stream: true,
    json: false,
    showPrompt: false,
    apiUrl: process.env.GX_API_URL ?? process.env.SOLVER_API_URL ?? defaultApiUrl,
    repoUrl: process.env.GALAXY_BRAIN_REPO_URL,
    localRepoPath: process.env.GALAXY_BRAIN_LOCAL_REPO_PATH ?? ".",
    baseBranch: process.env.GALAXY_BRAIN_BASE_BRANCH ?? "main",
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--stream") {
      options.stream = true;
      continue;
    }
    if (arg === "--no-stream") {
      options.stream = false;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      options.stream = false;
      continue;
    }
    if (arg === "--show-prompt") {
      options.showPrompt = true;
      continue;
    }

    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--harness") options.harness = value;
    else if (arg === "--model") options.model = value;
    else if (arg === "--solution" || arg === "--solution-slug") {
      options.solutionSlug = value;
    } else if (arg === "--config") options.configs.push(parseConfig(value));
    else if (arg === "--prompt-suffix") options.promptSuffix = appendPromptSuffix(
      options.promptSuffix,
      value
    );
    else if (arg === "--prompt-suffix-file") {
      const filePath = path.resolve(rootDir, value);
      options.promptSuffix = appendPromptSuffix(
        options.promptSuffix,
        readFileSync(filePath, "utf8")
      );
    } else if (arg === "--api-url") options.apiUrl = value;
    else if (arg === "--repo-url") options.repoUrl = value;
    else if (arg === "--local-repo-path") options.localRepoPath = value;
    else if (arg === "--base-branch") options.baseBranch = value;
    else if (arg === "--pr-base-branch") options.prBaseBranch = value;
    else if (arg === "--sandbox-timeout-ms") options.sandboxTimeoutMs = parsePositiveInt(value, arg);
    else if (arg === "--poll-interval-ms") options.pollIntervalMs = parsePositiveInt(value, arg);
    else if (arg === "--max-polls") options.maxPolls = parsePositiveInt(value, arg);
    else throw new Error(`Unknown option: ${arg}`);

    index += 1;
  }

  if (!harnesses.has(options.harness)) {
    throw new Error(`--harness must be one of ${Array.from(harnesses).join(", ")}`);
  }

  return options;
}

function parseRunIdArgs(args, command) {
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const [runId, ...rest] = args;
  if (!runId || runId.startsWith("-")) {
    throw new Error(`Usage: gx ${command} <run-id> [--api-url <url>]`);
  }

  const options = {
    runId,
    apiUrl: process.env.GX_API_URL ?? process.env.SOLVER_API_URL ?? defaultApiUrl,
    json: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }

    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--api-url") options.apiUrl = value;
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }

  return options;
}

function parseConfig(value) {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error("--config must look like harness:model or harness:model:solution-slug");
  }

  const [harness, model, solutionSlug] = parts;
  if (!harnesses.has(harness)) {
    throw new Error(`Invalid harness in --config: ${harness}`);
  }
  if (!model) throw new Error("Missing model in --config");

  return {
    harness,
    model,
    ...(solutionSlug ? { solutionSlug } : {}),
  };
}

function buildSolveBody(options) {
  const configs =
    options.configs.length > 0
      ? options.configs
      : [
          {
            harness: options.harness,
            model: options.model,
            ...(options.solutionSlug ? { solutionSlug: options.solutionSlug } : {}),
          },
        ];

  if (options.promptSuffix) {
    for (const config of configs) {
      config.promptSuffix = appendPromptSuffix(config.promptSuffix, options.promptSuffix);
    }
  }

  return omitUndefined({
    eval: options.evalSlug,
    dryRun: options.dryRun,
    configs,
    repoUrl: options.repoUrl,
    localRepoPath: options.localRepoPath,
    baseBranch: options.baseBranch,
    prBaseBranch: options.prBaseBranch,
    sandboxTimeoutMs: options.sandboxTimeoutMs,
    pollIntervalMs: options.pollIntervalMs,
    maxPolls: options.maxPolls,
  });
}

function appendPromptSuffix(existing, next) {
  return existing ? `${existing.trim()}\n\n${next.trim()}` : next.trim();
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function omitUndefined(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeApiUrl(value) {
  return (value || defaultApiUrl).replace(/\/+$/, "");
}

function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms === null || ms === undefined) return "-";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m${remainder.toString().padStart(2, "0")}s`;
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`${connectionMessage(url)}\n${error.message}`);
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}\n${JSON.stringify(
        parsed,
        null,
        2
      )}`
    );
  }

  return parsed;
}

async function getJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${connectionMessage(url)}\n${error.message}`);
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}\n${JSON.stringify(
        parsed,
        null,
        2
      )}`
    );
  }
  return parsed;
}

async function streamEvents(apiUrl, runId, { showPrompt }) {
  const seen = new Set();
  let response;

  try {
    response = await fetch(`${apiUrl}/api/runs/${runId}/events`);
  } catch (error) {
    throw new Error(`${connectionMessage(apiUrl)}\n${error.message}`);
  }

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`Event stream failed: ${response.status} ${response.statusText}\n${text}`);
  }

  console.log("Streaming workflow events...");

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || seen.has(payload)) continue;
      seen.add(payload);

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        console.log(payload);
        continue;
      }

      printEvent(event, { showPrompt });
    }
  }
}

function printEvent(event, { showPrompt }) {
  if (event.type === "workflow_started") {
    console.log(`workflow started: ${event.eval} (${event.configs.join(", ")})`);
  } else if (event.type === "dry_run_prompt") {
    if (showPrompt) {
      console.log(`\n--- prompt: ${event.eval}/${event.solution} ---\n${event.prompt}\n--- end prompt ---`);
    } else {
      console.log(`dry-run prompt built: ${event.eval}/${event.solution}`);
    }
  } else if (event.type === "sandbox_started") {
    console.log(`sandbox started: ${event.sandboxId}`);
    console.log(`branch: ${event.branch}`);
  } else if (event.type === "agent_log") {
    process[event.stream === "stderr" ? "stderr" : "stdout"].write(event.data);
  } else if (event.type === "agent_status") {
    console.log(
      `agent status: ${event.solution} poll ${event.poll}, done=${event.done}, exit=${event.exitCode}`
    );
  } else if (event.type === "finalized") {
    console.log(`finalized: ${event.pullRequestUrl}`);
  } else if (event.type === "failed") {
    console.error(`failed: ${event.solution}: ${event.message}`);
  } else {
    console.log(JSON.stringify(event));
  }
}

function warnAboutMissingSecrets(configs) {
  const missing = [];
  if (!process.env.VERCEL_OIDC_TOKEN) {
    const hasVercelTokenSet =
      process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID;
    if (!hasVercelTokenSet) {
      missing.push("VERCEL_OIDC_TOKEN or VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID");
    }
  }
  if (!process.env.GITHUB_TOKEN) missing.push("GITHUB_TOKEN");

  for (const config of configs) {
    if (config.harness === "codex" && !process.env.CODEX_API_KEY && !process.env.OPENAI_API_KEY) {
      missing.push("CODEX_API_KEY or OPENAI_API_KEY");
    } else if (config.harness === "cursor" && !process.env.CURSOR_API_KEY) {
      missing.push("CURSOR_API_KEY");
    } else if (config.harness === "claude" && !process.env.ANTHROPIC_API_KEY) {
      missing.push("ANTHROPIC_API_KEY");
    }
  }

  if (missing.length > 0) {
    console.warn("Warning: local .env appears to be missing:");
    for (const name of Array.from(new Set(missing))) {
      console.warn(`  - ${name}`);
    }
    console.warn("The workflow may still work if the target deployment/server has these env vars.");
  }
}

function connectionMessage(url) {
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
  if (!isLocal) return `Could not connect to ${url}`;
  return `Could not connect to ${url}. Start the local app with npm run dev first.`;
}

function loadEnvFile(name) {
  const filePath = path.join(rootDir, name);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
    if (!match) continue;

    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;

    process.env[key] = parseEnvValue(rawValue);
  }
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value[value.length - 1] === quote) {
    const inner = value.slice(1, -1);
    return quote === "\"" ? inner.replace(/\\n/g, "\n").replace(/\\"/g, "\"") : inner;
  }

  const hashIndex = value.indexOf(" #");
  return hashIndex === -1 ? value : value.slice(0, hashIndex).trim();
}
