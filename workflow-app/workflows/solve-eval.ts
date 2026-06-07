import { readFile } from "node:fs/promises";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { FatalError, getWritable, sleep } from "workflow";
import type { HarnessConfig, SolveWorkflowInput } from "@/lib/solve-request";

type SolveEvent =
  | { type: "workflow_started"; eval: string; dryRun: boolean; configs: string[] }
  | { type: "dry_run_prompt"; eval: string; solution: string; prompt: string }
  | {
      type: "sandbox_started";
      eval: string;
      solution: string;
      sandboxId: string;
      commandId: string;
      branch: string;
    }
  | {
      type: "agent_log";
      eval: string;
      solution: string;
      stream: "stdout" | "stderr";
      data: string;
    }
  | {
      type: "agent_status";
      eval: string;
      solution: string;
      done: boolean;
      exitCode: number | null;
      poll: number;
    }
  | {
      type: "finalized";
      eval: string;
      solution: string;
      branch: string;
      pullRequestUrl: string;
    }
  | { type: "failed"; eval: string; solution: string; message: string };

type StartedSolve = {
  sandboxName: string;
  commandId: string;
  evalSlug: string;
  solutionSlug: string;
  harness: string;
  model: string;
  branchName: string;
  repoDir: string;
  promptPath: string;
  exitCodePath: string;
  donePath: string;
};

type PollStatus = {
  done: boolean;
  exitCode: number | null;
  output?: string;
};

export type SolveWorkflowResult = {
  ok: boolean;
  eval: string;
  dryRun: boolean;
  results: Array<
    | {
        status: "dry-run";
        harness: string;
        model: string;
        solutionSlug: string;
        prompt: string;
      }
    | {
        status: "success";
        harness: string;
        model: string;
        solutionSlug: string;
        branch: string;
        pullRequestUrl: string;
      }
    | {
        status: "failed";
        harness: string;
        model: string;
        solutionSlug: string;
        message: string;
      }
  >;
};

export async function solveEvalWorkflow(input: SolveWorkflowInput): Promise<SolveWorkflowResult> {
  "use workflow";

  await emitEvent({
    type: "workflow_started",
    eval: input.evalSlug,
    dryRun: input.dryRun,
    configs: input.configs.map((config) => config.solutionSlug),
  });

  const results = await Promise.all(
    input.configs.map(async (config) => solveOneConfig(input, config))
  );

  await closeEventStream();

  return {
    ok: results.every((result) => result.status !== "failed"),
    eval: input.evalSlug,
    dryRun: input.dryRun,
    results,
  };
}

async function solveOneConfig(input: SolveWorkflowInput, config: HarnessConfig) {
  let started: StartedSolve | undefined;

  try {
    if (input.dryRun) {
      const prompt = await buildDryRunPrompt(input, config);
      return {
        status: "dry-run" as const,
        harness: config.harness,
        model: config.model,
        solutionSlug: config.solutionSlug,
        prompt,
      };
    }

    started = await startSandboxSolve(input, config);

    for (let poll = 1; poll <= input.maxPolls; poll += 1) {
      const status = await pollSandboxSolve(started, poll);
      if (status.done) {
        if (status.exitCode !== 0) {
          throw new FatalError(
            `Agent exited with code ${status.exitCode ?? "unknown"} for ${config.solutionSlug}`
          );
        }

        const finalized = await finalizeSandboxSolve(input, config, started);
        return {
          status: "success" as const,
          harness: config.harness,
          model: config.model,
          solutionSlug: config.solutionSlug,
          branch: started.branchName,
          pullRequestUrl: finalized.pullRequestUrl,
        };
      }

      await sleep(input.pollIntervalMs);
    }

    throw new FatalError(
      `Timed out waiting for ${config.solutionSlug} after ${input.maxPolls} polls`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emitEvent({
      type: "failed",
      eval: input.evalSlug,
      solution: config.solutionSlug,
      message,
    });

    if (started) {
      await stopSandbox(started, "failed");
    }

    return {
      status: "failed" as const,
      harness: config.harness,
      model: config.model,
      solutionSlug: config.solutionSlug,
      message,
    };
  }
}

async function emitEvent(event: SolveEvent): Promise<void> {
  "use step";

  const writer = getWritable<SolveEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function closeEventStream(): Promise<void> {
  "use step";

  await getWritable<SolveEvent>().close();
}

async function buildDryRunPrompt(
  input: SolveWorkflowInput,
  config: HarnessConfig
): Promise<string> {
  "use step";

  const prompt = await loadPromptText(input, config);
  await writeStepEvent({
    type: "dry_run_prompt",
    eval: input.evalSlug,
    solution: config.solutionSlug,
    prompt,
  });
  return prompt;
}

async function startSandboxSolve(
  input: SolveWorkflowInput,
  config: HarnessConfig
): Promise<StartedSolve> {
  "use step";

  if (!input.repoUrl) {
    throw new FatalError("repoUrl is required for sandbox solves");
  }

  const jobId = `${input.evalSlug}-${config.solutionSlug}-${Date.now().toString(36)}`;
  const sandboxName = `gb-${jobId}`;
  const branchName = `agent-solve/${input.evalSlug}/${config.solutionSlug}-${Date.now().toString(
    36
  )}`;
  const repoDir = "/vercel/sandbox/galaxy-brain";
  const promptPath = `/vercel/sandbox/prompts/${config.solutionSlug}.md`;
  const exitCodePath = `/vercel/sandbox/status/${jobId}/exit-code`;
  const donePath = `/vercel/sandbox/status/${jobId}/done-at`;

  const sandbox = await Sandbox.create({
    name: sandboxName,
    runtime: "node24",
    timeout: input.sandboxTimeoutMs,
    env: sandboxEnv(),
  });

  await sandbox.writeFiles([
    { path: "setup.sh", content: Buffer.from(setupScript()) },
    { path: "build-prompt.mjs", content: Buffer.from(buildPromptScript()) },
    { path: "agent-runner.sh", content: Buffer.from(agentRunnerScript()) },
    { path: "assert-changes.mjs", content: Buffer.from(assertChangesScript()) },
  ]);

  await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "chmod +x /vercel/sandbox/setup.sh /vercel/sandbox/agent-runner.sh"],
    cwd: "/vercel/sandbox",
  });

  const setup = await sandbox.runCommand({
    cmd: "bash",
    args: ["/vercel/sandbox/setup.sh"],
    cwd: "/vercel/sandbox",
    env: {
      REPO_URL: input.repoUrl,
      BASE_BRANCH: input.baseBranch,
      BRANCH_NAME: branchName,
      REPO_DIR: repoDir,
      EVAL_SLUG: input.evalSlug,
      SOLUTION_SLUG: config.solutionSlug,
      HARNESS: config.harness,
      MODEL: config.model,
      PROMPT_PATH: promptPath,
      EXIT_CODE_PATH: exitCodePath,
      DONE_PATH: donePath,
    },
  });

  if (setup.exitCode !== 0) {
    throw new FatalError(`Sandbox setup failed:\n${await setup.output("both")}`);
  }

  const command = await sandbox.runCommand({
    cmd: "bash",
    args: ["/vercel/sandbox/agent-runner.sh"],
    cwd: repoDir,
    detached: true,
    env: {
      REPO_DIR: repoDir,
      EVAL_SLUG: input.evalSlug,
      SOLUTION_SLUG: config.solutionSlug,
      HARNESS: config.harness,
      MODEL: config.model,
      PROMPT_PATH: promptPath,
      EXIT_CODE_PATH: exitCodePath,
      DONE_PATH: donePath,
    },
  });

  const started: StartedSolve = {
    sandboxName: sandbox.name,
    commandId: command.cmdId,
    evalSlug: input.evalSlug,
    solutionSlug: config.solutionSlug,
    harness: config.harness,
    model: config.model,
    branchName,
    repoDir,
    promptPath,
    exitCodePath,
    donePath,
  };

  await writeStepEvent({
    type: "sandbox_started",
    eval: input.evalSlug,
    solution: config.solutionSlug,
    sandboxId: sandbox.name,
    commandId: command.cmdId,
    branch: branchName,
  });

  await streamCommandLogs(sandbox, started, 1500);

  return started;
}

async function pollSandboxSolve(started: StartedSolve, poll: number): Promise<PollStatus> {
  "use step";

  const sandbox = await Sandbox.get({ name: started.sandboxName });
  await streamCommandLogs(sandbox, started, 2500);

  const exitCodeBuffer = await sandbox.readFileToBuffer({ path: started.exitCodePath });
  const exitCode =
    exitCodeBuffer === null ? null : Number.parseInt(exitCodeBuffer.toString("utf8").trim(), 10);
  const done = Number.isInteger(exitCode);

  await writeStepEvent({
    type: "agent_status",
    eval: started.evalSlug,
    solution: started.solutionSlug,
    done,
    exitCode: done ? exitCode : null,
    poll,
  });

  if (!done) return { done: false, exitCode: null };

  const command = await sandbox.getCommand(started.commandId);
  const output = await command.output("both");
  return { done: true, exitCode, output };
}

async function finalizeSandboxSolve(
  input: SolveWorkflowInput,
  config: HarnessConfig,
  started: StartedSolve
): Promise<{ pullRequestUrl: string }> {
  "use step";

  if (!process.env.GITHUB_TOKEN) {
    throw new FatalError("GITHUB_TOKEN is required to push and open a PR");
  }
  if (!input.repoOwner || !input.repoName) {
    throw new FatalError("repoUrl must point at github.com/<owner>/<repo>.git to open a PR");
  }

  const sandbox = await Sandbox.get({ name: started.sandboxName });
  const finalize = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", finalizeScript()],
    cwd: started.repoDir,
    env: {
      REPO_DIR: started.repoDir,
      EVAL_SLUG: input.evalSlug,
      SOLUTION_SLUG: config.solutionSlug,
      BRANCH_NAME: started.branchName,
    },
  });

  const output = await finalize.output("both");
  if (finalize.exitCode !== 0) {
    throw new FatalError(`Finalize failed for ${config.solutionSlug}:\n${output}`);
  }

  const pullRequestUrl = await createDraftPullRequest(input, config, started.branchName);

  await writeStepEvent({
    type: "finalized",
    eval: input.evalSlug,
    solution: config.solutionSlug,
    branch: started.branchName,
    pullRequestUrl,
  });

  await sandbox.stop();
  return { pullRequestUrl };
}

async function stopSandbox(started: StartedSolve, reason: string): Promise<void> {
  "use step";

  try {
    const sandbox = await Sandbox.get({ name: started.sandboxName });
    await sandbox.stop();
    console.log(`[stopSandbox] stopped ${started.sandboxName} after ${reason}`);
  } catch (error) {
    console.warn(`[stopSandbox] could not stop ${started.sandboxName}:`, error);
  }
}

async function writeStepEvent(event: SolveEvent): Promise<void> {
  const writer = getWritable<SolveEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function streamCommandLogs(
  sandbox: Awaited<ReturnType<typeof Sandbox.get>>,
  started: StartedSolve,
  maxMs: number
): Promise<void> {
  const command = await sandbox.getCommand(started.commandId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), maxMs);

  try {
    for await (const log of command.logs({ signal: controller.signal })) {
      await writeStepEvent({
        type: "agent_log",
        eval: started.evalSlug,
        solution: started.solutionSlug,
        stream: log.stream,
        data: log.data,
      });
    }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "AbortError") {
      console.warn(`[streamCommandLogs] stopped reading logs for ${started.commandId}:`, error);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPromptText(input: SolveWorkflowInput, config: HarnessConfig): Promise<string> {
  const localPrompt = await tryLocalPrompt(input, config);
  if (localPrompt) return localPrompt;

  if (!input.repoUrl) {
    throw new FatalError(
      "Dry runs need either GALAXY_BRAIN_LOCAL_REPO_PATH/localRepoPath or repoUrl"
    );
  }

  const { agents, evalReadme } = await fetchPromptFiles(input);
  return renderPrompt(input.evalSlug, config, agents, evalReadme);
}

async function tryLocalPrompt(
  input: SolveWorkflowInput,
  config: HarnessConfig
): Promise<string | null> {
  const candidates = [
    input.localRepoPath,
    process.env.GALAXY_BRAIN_LOCAL_REPO_PATH,
    process.env.VERCEL ? undefined : "..",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), candidate);
    try {
      const [agents, evalReadme] = await Promise.all([
        readFile(path.join(root, "AGENTS.md"), "utf8"),
        readFile(path.join(root, input.evalSlug, "README.md"), "utf8"),
      ]);
      return renderPrompt(input.evalSlug, config, agents, evalReadme);
    } catch {
      // Try the next local candidate, then fall back to GitHub raw content.
    }
  }

  return null;
}

async function fetchPromptFiles(input: SolveWorkflowInput): Promise<{
  agents: string;
  evalReadme: string;
}> {
  if (!input.repoOwner || !input.repoName) {
    throw new FatalError("repoUrl must point at github.com/<owner>/<repo>.git for dry-run fetches");
  }

  const base = `https://raw.githubusercontent.com/${input.repoOwner}/${input.repoName}/${input.baseBranch}`;
  const headers = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : undefined;

  const [agentsResponse, evalResponse] = await Promise.all([
    fetch(`${base}/AGENTS.md`, { headers }),
    fetch(`${base}/${input.evalSlug}/README.md`, { headers }),
  ]);

  if (!agentsResponse.ok) {
    throw new FatalError(`Could not fetch AGENTS.md: HTTP ${agentsResponse.status}`);
  }
  if (!evalResponse.ok) {
    throw new FatalError(
      `Could not fetch ${input.evalSlug}/README.md: HTTP ${evalResponse.status}`
    );
  }

  return {
    agents: await agentsResponse.text(),
    evalReadme: await evalResponse.text(),
  };
}

function renderPrompt(
  evalSlug: string,
  config: HarnessConfig,
  agents: string,
  evalReadme: string
): string {
  const suffix = config.promptSuffix ? `\n\nAdditional run instructions:\n${config.promptSuffix}` : "";

  return `You are running a galaxy-brain eval solve job.

Target eval: ${evalSlug}
Target harness: ${config.harness}
Target model: ${config.model}
Target solution slug: ${config.solutionSlug}
Target solution directory: ${evalSlug}/${config.solutionSlug}/

You are responsible for authoring the solution only. Do not commit, push, or open a pull request; the orchestrator will do that after you finish.

Follow these constraints exactly:
- Put all solution source files under ${evalSlug}/${config.solutionSlug}/.
- Add or update ${evalSlug}/${config.solutionSlug}/README.md with what was built, how to run from a fresh clone, required environment variables, and the best file or command for evaluation.
- Add the matching solution entry to docs/data.json.
- If you produce a browsable HTML artifact, mirror it to public/artifacts/${evalSlug}/${config.solutionSlug}.html and set artifactUrl to ./artifacts/${evalSlug}/${config.solutionSlug}.html.
- Do not edit eval prompts, other solutions, site styling, or unrelated tooling.
- Before finishing, run node scripts/validate-content.mjs if possible and fix any issues it reports.

Repository submission conventions from AGENTS.md:

${agents}

Eval prompt from ${evalSlug}/README.md:

${evalReadme}${suffix}
`;
}

function sandboxEnv(): Record<string, string> {
  const names = [
    "OPENAI_API_KEY",
    "CURSOR_API_KEY",
    "ANTHROPIC_API_KEY",
    "GITHUB_TOKEN",
    "VERCEL_TOKEN",
    "VERCEL_TEAM_ID",
    "VERCEL_PROJECT_ID",
  ];
  const env: Record<string, string> = {};

  for (const name of names) {
    const value = process.env[name];
    if (value) env[name] = value;
  }

  env.GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME ?? "galaxy-brain solver";
  env.GIT_AUTHOR_EMAIL =
    process.env.GIT_AUTHOR_EMAIL ?? "solver@users.noreply.github.com";
  env.GIT_COMMITTER_NAME = env.GIT_AUTHOR_NAME;
  env.GIT_COMMITTER_EMAIL = env.GIT_AUTHOR_EMAIL;
  env.CLAUDE_CODE_SKIP_PROMPT_HISTORY = "1";
  env.CI = "1";

  return env;
}

function setupScript(): string {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'mkdir -p "$(dirname "$PROMPT_PATH")" "$(dirname "$EXIT_CODE_PATH")"',
    "",
    'git config --global user.name "${GIT_AUTHOR_NAME:-galaxy-brain solver}"',
    'git config --global user.email "${GIT_AUTHOR_EMAIL:-solver@users.noreply.github.com}"',
    "",
    'if [ -n "${GITHUB_TOKEN:-}" ]; then',
    "  git config --global credential.helper store",
    '  printf "https://x-access-token:%s@github.com\\n" "$GITHUB_TOKEN" > "$HOME/.git-credentials"',
    "fi",
    "",
    'git clone --branch "$BASE_BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"',
    'cd "$REPO_DIR"',
    'git checkout -b "$BRANCH_NAME"',
    "",
    "node /vercel/sandbox/build-prompt.mjs",
    "",
  ].join("\n");
}

function buildPromptScript(): string {
  return [
    'import { readFileSync, writeFileSync } from "node:fs";',
    'import path from "node:path";',
    "",
    "const {",
    "  REPO_DIR,",
    "  EVAL_SLUG,",
    "  SOLUTION_SLUG,",
    "  HARNESS,",
    "  MODEL,",
    "  PROMPT_PATH,",
    "} = process.env;",
    "",
    "function required(name, value) {",
    '  if (!value) throw new Error(`${name} is required`);',
    "  return value;",
    "}",
    "",
    'const repoDir = required("REPO_DIR", REPO_DIR);',
    'const evalSlug = required("EVAL_SLUG", EVAL_SLUG);',
    'const solutionSlug = required("SOLUTION_SLUG", SOLUTION_SLUG);',
    'const harness = required("HARNESS", HARNESS);',
    'const model = required("MODEL", MODEL);',
    'const promptPath = required("PROMPT_PATH", PROMPT_PATH);',
    "",
    'const agents = readFileSync(path.join(repoDir, "AGENTS.md"), "utf8");',
    'const evalReadme = readFileSync(path.join(repoDir, evalSlug, "README.md"), "utf8");',
    "",
    "const prompt = `You are running a galaxy-brain eval solve job.",
    "",
    "Target eval: ${evalSlug}",
    "Target harness: ${harness}",
    "Target model: ${model}",
    "Target solution slug: ${solutionSlug}",
    "Target solution directory: ${evalSlug}/${solutionSlug}/",
    "",
    "You are responsible for authoring the solution only. Do not commit, push, or open a pull request; the orchestrator will do that after you finish.",
    "",
    "Follow these constraints exactly:",
    "- Put all solution source files under ${evalSlug}/${solutionSlug}/.",
    "- Add or update ${evalSlug}/${solutionSlug}/README.md with what was built, how to run from a fresh clone, required environment variables, and the best file or command for evaluation.",
    "- Add the matching solution entry to docs/data.json.",
    "- If you produce a browsable HTML artifact, mirror it to public/artifacts/${evalSlug}/${solutionSlug}.html and set artifactUrl to ./artifacts/${evalSlug}/${solutionSlug}.html.",
    "- Do not edit eval prompts, other solutions, site styling, or unrelated tooling.",
    "- Before finishing, run node scripts/validate-content.mjs if possible and fix any issues it reports.",
    "",
    "Repository submission conventions from AGENTS.md:",
    "",
    "${agents}",
    "",
    "Eval prompt from ${evalSlug}/README.md:",
    "",
    "${evalReadme}",
    "`;",
    "",
    "writeFileSync(promptPath, prompt);",
    "console.log(`Wrote prompt to ${promptPath}`);",
    "",
  ].join("\n");
}

function agentRunnerScript(): string {
  return [
    "#!/usr/bin/env bash",
    "set -uo pipefail",
    "",
    'TOOLS_DIR="/vercel/sandbox/.agent-tools"',
    'mkdir -p "$TOOLS_DIR" "$(dirname "$EXIT_CODE_PATH")"',
    'export PATH="$TOOLS_DIR/node_modules/.bin:$HOME/.local/bin:$PATH"',
    "",
    'cd "$REPO_DIR"',
    'rm -f "$EXIT_CODE_PATH" "$DONE_PATH"',
    "",
    "ensure_codex() {",
    "  if ! command -v codex >/dev/null 2>&1; then",
    '    npm install --prefix "$TOOLS_DIR" @openai/codex@latest',
    "  fi",
    "}",
    "",
    "ensure_cursor() {",
    "  if ! command -v cursor-agent >/dev/null 2>&1; then",
    "    curl https://cursor.com/install -fsS | bash",
    '    export PATH="$HOME/.local/bin:$PATH"',
    "  fi",
    "}",
    "",
    "ensure_claude() {",
    "  if ! command -v claude >/dev/null 2>&1; then",
    '    npm install --prefix "$TOOLS_DIR" @anthropic-ai/claude-code@latest',
    "  fi",
    "}",
    "",
    "run_agent() {",
    '  case "$HARNESS" in',
    "    codex)",
    "      ensure_codex",
    '      codex exec --dangerously-bypass-approvals-and-sandbox --model "$MODEL" - < "$PROMPT_PATH"',
    "      ;;",
    "    cursor)",
    "      ensure_cursor",
    '      cursor-agent -p --force --trust --model "$MODEL" "$(cat "$PROMPT_PATH")"',
    "      ;;",
    "    claude)",
    "      ensure_claude",
    '      claude -p --dangerously-skip-permissions --model "$MODEL" "$(cat "$PROMPT_PATH")"',
    "      ;;",
    "    *)",
    '      echo "Unsupported harness: $HARNESS" >&2',
    "      return 64",
    "      ;;",
    "  esac",
    "}",
    "",
    'echo "Starting $HARNESS agent for $EVAL_SLUG/$SOLUTION_SLUG with model $MODEL"',
    "run_agent",
    "exit_code=$?",
    'printf "%s\\n" "$exit_code" > "$EXIT_CODE_PATH"',
    'date -u +"%Y-%m-%dT%H:%M:%SZ" > "$DONE_PATH"',
    'echo "Agent finished with exit code $exit_code"',
    'exit "$exit_code"',
    "",
  ].join("\n");
}

function assertChangesScript(): string {
  return [
    'import { execFileSync } from "node:child_process";',
    "",
    "const evalSlug = process.env.EVAL_SLUG;",
    "const solutionSlug = process.env.SOLUTION_SLUG;",
    "",
    "if (!evalSlug || !solutionSlug) {",
    '  throw new Error("EVAL_SLUG and SOLUTION_SLUG are required");',
    "}",
    "",
    "function lines(command, args) {",
    '  const output = execFileSync(command, args, { encoding: "utf8" });',
    '  return output.split("\\n").map((line) => line.trim()).filter(Boolean);',
    "}",
    "",
    "const paths = new Set([",
    '  ...lines("git", ["diff", "--name-only", "HEAD"]),',
    '  ...lines("git", ["ls-files", "--others", "--exclude-standard"]),',
    "]);",
    "",
    "const allowedPrefix = `${evalSlug}/${solutionSlug}/`;",
    "const allowedArtifact = `public/artifacts/${evalSlug}/${solutionSlug}.html`;",
    "const disallowed = [...paths].filter((file) => {",
    "  return (",
    '    file !== "docs/data.json" &&',
    "    file !== allowedArtifact &&",
    "    !file.startsWith(allowedPrefix)",
    "  );",
    "});",
    "",
    "if (paths.size === 0) {",
    '  throw new Error("Agent produced no changes");',
    "}",
    "",
    "if (disallowed.length > 0) {",
    '  throw new Error(`Disallowed changed files:\\n${disallowed.join("\\n")}`);',
    "}",
    "",
    "console.log(`Changed-file guard passed for ${paths.size} path(s).`);",
    "",
  ].join("\n");
}

function finalizeScript(): string {
  return [
    "set -euo pipefail",
    "",
    'cd "$REPO_DIR"',
    "",
    "node scripts/validate-content.mjs",
    "node /vercel/sandbox/assert-changes.mjs",
    "",
    'git add -- "$EVAL_SLUG/$SOLUTION_SLUG" docs/data.json',
    'if [ -f "public/artifacts/$EVAL_SLUG/$SOLUTION_SLUG.html" ]; then',
    '  git add -- "public/artifacts/$EVAL_SLUG/$SOLUTION_SLUG.html"',
    "fi",
    "",
    "git diff --cached --check",
    "if git diff --cached --quiet; then",
    '  echo "No staged changes after applying allowlist" >&2',
    "  exit 20",
    "fi",
    "",
    'git commit -m "Add $SOLUTION_SLUG solution for $EVAL_SLUG"',
    'git push --set-upstream origin "$BRANCH_NAME"',
    "",
  ].join("\n");
}

async function createDraftPullRequest(
  input: SolveWorkflowInput,
  config: HarnessConfig,
  branchName: string
): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !input.repoOwner || !input.repoName) {
    throw new FatalError("GITHUB_TOKEN and GitHub repo owner/name are required");
  }

  const apiBase = `https://api.github.com/repos/${input.repoOwner}/${input.repoName}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const response = await fetch(`${apiBase}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: `Add ${config.solutionSlug} solution for ${input.evalSlug}`,
      head: branchName,
      base: input.prBaseBranch,
      draft: true,
      body: [
        `Automated solve for \`${input.evalSlug}\`.`,
        "",
        `Harness: \`${config.harness}\``,
        `Model: \`${config.model}\``,
        `Solution: \`${input.evalSlug}/${config.solutionSlug}/\``,
        "",
        "The orchestrator validated content, committed the allowlisted changes, and opened this draft PR.",
      ].join("\n"),
    }),
  });

  if (response.status === 201) {
    const data = (await response.json()) as { html_url?: string };
    if (!data.html_url) throw new FatalError("GitHub PR response did not include html_url");
    return data.html_url;
  }

  if (response.status === 422) {
    const existing = await findExistingPullRequest(input, branchName, headers);
    if (existing) return existing;
  }

  throw new FatalError(`GitHub PR creation failed: HTTP ${response.status} ${await response.text()}`);
}

async function findExistingPullRequest(
  input: SolveWorkflowInput,
  branchName: string,
  headers: Record<string, string>
): Promise<string | null> {
  const params = new URLSearchParams({
    state: "open",
    head: `${input.repoOwner}:${branchName}`,
  });
  const response = await fetch(
    `https://api.github.com/repos/${input.repoOwner}/${input.repoName}/pulls?${params}`,
    { headers }
  );

  if (!response.ok) return null;
  const pulls = (await response.json()) as Array<{ html_url?: string }>;
  return pulls[0]?.html_url ?? null;
}
