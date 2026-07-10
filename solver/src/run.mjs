import { firstEnv, requireEnv } from "./env.mjs";
import { loadEval, readRegistry, toSlug, isSlug } from "./evals.mjs";
import { getHarness } from "./harness.mjs";
import { buildPrompt } from "./prompt.mjs";
import {
  makeDaytona,
  createSandbox,
  getWorkDir,
  exec,
  execStream,
  writeFileInSandbox,
} from "./daytona.mjs";
import { githubToken, authedRemote, createPullRequest } from "./github.mjs";
import { createConsoleReporter } from "./reporter.mjs";

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

/** Resolve the {owner, name, base} of the repo to clone. */
async function resolveRepo(options) {
  let owner = options.owner;
  let name = options.repoName;
  if (!owner || !name) {
    try {
      const registry = await readRegistry();
      owner ??= registry.repo?.owner;
      name ??= registry.repo?.name;
    } catch {
      /* ignore */
    }
  }
  if (!owner || !name) {
    throw new Error(
      "Could not determine the GitHub repo. Pass --owner and --repo-name, or ensure docs/data.json has repo.owner/repo.name."
    );
  }
  return { owner, name, base: options.baseBranch || "main" };
}

export async function run(options) {
  const emit = options.emit ?? createConsoleReporter();
  const harness = getHarness(options.harness);
  const model = options.model ?? harness.defaultModel;

  // --- Resolve the solution slug -----------------------------------------
  let solutionSlug = options.solutionSlug;
  if (!solutionSlug) {
    solutionSlug = model
      ? `${harness.id}-${toSlug(model)}`
      : harness.id;
  }
  if (!isSlug(solutionSlug)) {
    throw new Error(
      `Computed solution slug "${solutionSlug}" is not valid kebab-case. Pass --solution-slug explicitly.`
    );
  }

  const ev = await loadEval(options.eval);
  const repo = await resolveRepo(options);

  const branch =
    options.branch ||
    `solver/${ev.slug}-${solutionSlug}-${shortId()}`;

  const prompt = buildPrompt({
    evalSlug: ev.slug,
    evalPrompt: ev.prompt,
    solutionSlug,
    harnessLabel: harness.label,
    harnessId: harness.id,
    model,
    repoDir: "<repo>", // replaced below once we know the absolute path
  });

  const planLines = [
    "─".repeat(60),
    `Eval:        ${ev.slug}`,
    `Harness:     ${harness.id} (${harness.label})`,
    `Model:       ${model || "(harness default)"}`,
    `Solution:    ${ev.slug}/${solutionSlug}`,
    `Repo:        ${repo.owner}/${repo.name} (base: ${repo.base})`,
    `Branch:      ${branch}`,
  ];

  // --- Dry run: print plan + prompt and bail before touching any secrets ---
  if (options.dryRun) {
    for (const line of [...planLines, "─".repeat(60)]) emit("info", line);
    emit("info", "\n[dry-run] Sandbox will NOT be created. Prompt preview:\n");
    emit("plan", prompt.replace(/<repo>/g, "~/galaxy-brain") + "\n");
    const result = { dryRun: true, eval: ev.slug, solutionSlug, branch };
    emit("result", result);
    return result;
  }

  // --- Credentials --------------------------------------------------------
  const agentKeyValue = requireEnv(
    harness.apiKey.aliases,
    `${harness.label} API key`
  );
  const token = githubToken();
  const wantPush = options.push !== false && Boolean(token);
  if (options.push !== false && !token) {
    emit(
      "warn",
      "no GITHUB_TOKEN/GH_TOKEN found — the solution will be built in the sandbox but NOT pushed. The sandbox will be kept for inspection."
    );
  }

  for (const line of planLines) emit("info", line);
  emit("info", `Push + PR:   ${wantPush ? (options.draft ? "yes (draft)" : "yes") : "no"}`);
  emit("info", "─".repeat(60));

  // --- Sandbox env --------------------------------------------------------
  const gitName = firstEnv("GIT_AUTHOR_NAME") || "galaxy-brain-solver";
  const gitEmail =
    firstEnv("GIT_AUTHOR_EMAIL") || "galaxy-brain-solver@users.noreply.github.com";

  const sandboxEnv = {
    [harness.apiKey.sandboxVar]: agentKeyValue,
    GIT_AUTHOR_NAME: gitName,
    GIT_AUTHOR_EMAIL: gitEmail,
    GIT_COMMITTER_NAME: gitName,
    GIT_COMMITTER_EMAIL: gitEmail,
    GIT_TERMINAL_PROMPT: "0",
  };
  // Some CLIs read an alternate var name; forward a couple of common aliases.
  if (harness.id === "codex") {
    sandboxEnv.OPENAI_API_KEY = agentKeyValue;
    const base = firstEnv("OPENAI_BASE_URL");
    if (base) sandboxEnv.OPENAI_BASE_URL = base;
  }

  const daytona = makeDaytona();
  emit("step", "Creating Daytona sandbox (full internet access)…");
  const sandbox = await createSandbox(daytona, {
    envVars: sandboxEnv,
    snapshot: options.snapshot,
    emit,
    labels: {
      purpose: "galaxy-brain-solver",
      eval: ev.slug,
      harness: harness.id,
      solution: solutionSlug,
    },
  });
  emit("info", `Sandbox created: ${sandbox.id}`);
  emit("status", { phase: "sandbox", sandboxId: sandbox.id });

  let keepSandbox = options.keepSandbox;
  let pushed = false;
  let prResult;

  try {
    const workDir = await getWorkDir(sandbox);
    const repoDir = `${workDir}/galaxy-brain`;
    const promptPath = `${workDir}/solver-prompt.md`;

    // 1. Install the agent CLI.
    emit("step", `Installing ${harness.label}…`);
    emit("status", { phase: "install" });
    for (const step of harness.install) {
      await exec(sandbox, step, { timeoutSec: 600, emit });
    }
    await exec(sandbox, harness.versionCommand, {
      allowFailure: true,
      display: `${harness.bin} --version`,
      emit,
    });

    // 2. Clone the repo (authenticated if we have a token; read-only HTTPS otherwise).
    emit("step", "Cloning galaxy-brain…");
    emit("status", { phase: "clone" });
    const cloneUrl = token
      ? authedRemote({ owner: repo.owner, name: repo.name, token })
      : `https://github.com/${repo.owner}/${repo.name}.git`;
    await exec(
      sandbox,
      `rm -rf "${repoDir}" && git clone --depth 1 --branch "${repo.base}" "${cloneUrl}" "${repoDir}"`,
      {
        display: `git clone https://github.com/${repo.owner}/${repo.name}.git (base: ${repo.base})`,
        timeoutSec: 300,
        emit,
      }
    );

    // 3. Configure identity + create the solution branch.
    await exec(
      sandbox,
      `git config user.name "${gitName}" && git config user.email "${gitEmail}" && git checkout -b "${branch}"`,
      { cwd: repoDir, display: `git checkout -b ${branch}`, emit }
    );

    // 4. Drop the prompt (outside the repo so it never gets committed).
    const finalPrompt = prompt.replace(/<repo>/g, repoDir);
    await writeFileInSandbox(sandbox, promptPath, finalPrompt, { emit });

    // 5. Run the agent.
    emit("step", `Running ${harness.label} on "${ev.slug}"…`);
    emit("status", { phase: "agent" });
    const runCommand = harness.buildRunCommand({ model, promptPath });
    const agentExit = await execStream(sandbox, runCommand, {
      cwd: repoDir,
      timeoutSec: options.timeout,
      display: `${harness.bin} (headless) — eval ${ev.slug}`,
      emit,
    });
    if (agentExit !== 0) {
      emit(
        "warn",
        `agent exited with code ${agentExit}. Continuing to inspect/commit whatever it produced.`
      );
    }

    // 6. Best-effort content validation (informational).
    emit("step", "Validating content registry…");
    emit("status", { phase: "validate" });
    await exec(sandbox, "node scripts/validate-content.mjs", {
      cwd: repoDir,
      allowFailure: true,
      emit,
    });

    // 7. What changed?
    const status = await exec(sandbox, "git status --porcelain", {
      cwd: repoDir,
      display: "git status --porcelain",
      emit,
    });
    const changedFiles = status.output
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (changedFiles.length === 0) {
      emit(
        "warn",
        "the agent produced no file changes. Nothing to commit or push."
      );
      keepSandbox = true;
      const result = {
        sandboxId: sandbox.id,
        branch,
        changedFiles: [],
        pushed: false,
        eval: ev.slug,
        solutionSlug,
      };
      emit("result", result);
      return result;
    }

    // 8. Commit.
    const commitMessage = `${ev.slug}: add ${solutionSlug} (${harness.id}${
      model ? `, ${model}` : ""
    })`;
    await exec(
      sandbox,
      `git add -A && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
      { cwd: repoDir, display: `git commit -m "${commitMessage}"`, allowFailure: true, emit }
    );

    // 9. Push + PR.
    if (wantPush) {
      emit("step", "Pushing branch…");
      emit("status", { phase: "push" });
      await exec(sandbox, `git push -u origin "${branch}"`, {
        cwd: repoDir,
        display: `git push -u origin ${branch}`,
        timeoutSec: 300,
        emit,
      });
      pushed = true;

      if (options.openPr !== false) {
        emit("step", "Opening pull request…");
        emit("status", { phase: "pr" });
        const body = [
          `Automated solution for the \`${ev.slug}\` eval.`,
          "",
          `- **Harness:** ${harness.label} (\`${harness.id}\`)`,
          `- **Model:** ${model || "(harness default)"}`,
          `- **Solution:** \`${ev.slug}/${solutionSlug}\``,
          `- **Generated in Daytona sandbox:** \`${sandbox.id}\``,
          "",
          "### Files changed",
          "",
          "```",
          changedFiles.join("\n"),
          "```",
          "",
          `Preview (once Vercel builds): \`/eval/${ev.slug}/${solutionSlug}\``,
        ].join("\n");

        try {
          prResult = await createPullRequest({
            owner: repo.owner,
            name: repo.name,
            token,
            head: branch,
            base: repo.base,
            title: `${ev.slug}: ${solutionSlug} (${harness.id})`,
            body,
            draft: options.draft !== false,
          });
          emit("info", `Pull request opened: ${prResult.url}`);
        } catch (error) {
          emit("warn", error.message);
          emit("warn", `Branch "${branch}" is pushed; open a PR manually if needed.`);
        }
      }
    }

    const result = {
      sandboxId: sandbox.id,
      branch,
      changedFiles,
      pushed,
      pr: prResult,
      solutionSlug,
      eval: ev.slug,
    };
    emit("result", result);
    return result;
  } catch (error) {
    keepSandbox = true; // keep for debugging on failure
    throw error;
  } finally {
    if (keepSandbox) {
      emit(
        "info",
        `\nSandbox kept for inspection: ${sandbox.id} (delete it from the Daytona dashboard or with the SDK when done).`
      );
    } else {
      emit("step", "Cleaning up sandbox…");
      await sandbox.delete().catch((e) => {
        emit("warn", `failed to delete sandbox ${sandbox.id}: ${e.message}`);
      });
    }
  }
}
