#!/usr/bin/env node
import { loadEnv } from "../src/env.mjs";
import { run } from "../src/run.mjs";
import { listEvals } from "../src/evals.mjs";
import { listHarnesses } from "../src/harness.mjs";

loadEnv();

const HELP = `galaxy-brain solver — run a coding agent in a Daytona sandbox and submit a solution PR.

Usage:
  solve run --eval <slug> --harness <codex|cursor|claude> [options]
  solve evals
  solve harnesses

Run options:
  --eval <slug>            (required) Eval folder slug, e.g. evading-demons
  --harness <id>           (required) codex | cursor | claude
  --model <name>           Model for the harness (defaults per harness)
  --solution-slug <slug>   Override the solution dir/registry slug
                           (default: <harness>-<model>)
  --branch <name>          Override the git branch to push
                           (default: solver/<eval>-<solution>-<id>)
  --base-branch <name>     Base branch to clone / open the PR against (default: main)
  --owner <login>          GitHub owner (default: from docs/data.json)
  --repo-name <name>       GitHub repo name (default: from docs/data.json)
  --snapshot <name>        Daytona snapshot to base the sandbox on
  --timeout <seconds>      Max agent run time (default: 3600)
  --no-push                Build in the sandbox but do not push or open a PR
  --no-pr                  Push the branch but do not open a pull request
  --no-draft               Open the PR as ready-for-review instead of draft
  --keep-sandbox           Do not delete the sandbox when finished
  --dry-run                Print the plan + prompt without creating a sandbox
  -h, --help               Show this help

Environment (put these in the repo-root .env):
  DAYTONA_API_KEY                 (required) Daytona API key
  DAYTONA_API_URL / DAYTONA_TARGET / DAYTONA_ORGANIZATION_ID   (optional)
  OPENAI_API_KEY                  for --harness codex
  CURSOR_API_KEY                  for --harness cursor
  ANTHROPIC_API_KEY               for --harness claude
  GITHUB_TOKEN / GH_TOKEN         to push the branch and open the PR
  GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL   (optional) commit identity

Examples:
  solve run --eval evading-demons --harness codex --model gpt-5-codex
  solve run --eval sweats-dossier --harness claude --model opus --no-draft
  solve run --eval life-sim --harness cursor --dry-run
`;

const BOOLEAN_FLAGS = new Set([
  "--no-push",
  "--no-pr",
  "--no-draft",
  "--keep-sandbox",
  "--dry-run",
  "--help",
  "-h",
]);

function parseArgs(argv) {
  const options = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }
    if (BOOLEAN_FLAGS.has(arg)) {
      options[arg] = true;
      continue;
    }
    let key = arg;
    let value;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      key = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    } else {
      value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${key}`);
      }
      i += 1;
    }
    options[key] = value;
  }
  return { positionals, options };
}

function fail(message) {
  console.error(`Error: ${message}\n`);
  console.error("Run `solve --help` for usage.");
  process.exit(1);
}

async function cmdEvals() {
  const evals = await listEvals();
  if (evals.length === 0) {
    console.log("No evals found.");
    return;
  }
  console.log("Available evals:\n");
  for (const e of evals) {
    const flag = e.hasFolder ? "" : "  (missing folder/README.md)";
    console.log(`  ${e.slug}${flag}`);
    if (e.tagline) console.log(`      ${e.tagline}`);
    console.log(`      solutions: ${e.solutions}`);
  }
}

function cmdHarnesses() {
  console.log("Supported harnesses:\n");
  for (const h of listHarnesses()) {
    console.log(`  ${h.id.padEnd(8)} ${h.label}`);
    console.log(`      default model: ${h.defaultModel || "(CLI default)"}`);
    console.log(`      needs env:     ${h.apiKey.aliases.join(" / ")}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const { positionals, options } = parseArgs(argv);

  if (options["--help"] || options["-h"]) {
    console.log(HELP);
    return;
  }

  const command = positionals[0] ?? "run";

  if (command === "evals") return cmdEvals();
  if (command === "harnesses") return cmdHarnesses();
  if (command !== "run") fail(`Unknown command "${command}".`);

  if (!options["--eval"]) fail("--eval <slug> is required.");
  if (!options["--harness"]) fail("--harness <codex|cursor|claude> is required.");

  const timeout = options["--timeout"] ? Number(options["--timeout"]) : 3600;
  if (Number.isNaN(timeout) || timeout <= 0) fail("--timeout must be a positive number of seconds.");

  const result = await run({
    eval: options["--eval"],
    harness: options["--harness"],
    model: options["--model"],
    solutionSlug: options["--solution-slug"],
    branch: options["--branch"],
    baseBranch: options["--base-branch"],
    owner: options["--owner"],
    repoName: options["--repo-name"],
    snapshot: options["--snapshot"],
    timeout,
    push: options["--no-push"] ? false : true,
    openPr: options["--no-pr"] ? false : true,
    draft: options["--no-draft"] ? false : true,
    keepSandbox: Boolean(options["--keep-sandbox"]),
    dryRun: Boolean(options["--dry-run"]),
  });

  if (result?.dryRun) return;

  console.log("\n" + "─".repeat(60));
  console.log("Done.");
  if (result?.branch) console.log(`Branch:    ${result.branch}`);
  if (result?.changedFiles)
    console.log(`Files:     ${result.changedFiles.length} changed`);
  if (result?.pr?.url) console.log(`PR:        ${result.pr.url}`);
  else if (result?.pushed) console.log("Pushed (no PR opened).");
  console.log("─".repeat(60));
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  if (process.env.SOLVER_DEBUG) console.error(error.stack);
  process.exit(1);
});
