# solver

A CLI that runs a coding-agent in an isolated [Daytona](https://www.daytona.io/)
sandbox (with full internet access), hands it a galaxy-brain **eval prompt**, and
lets it **submit a solution as a pull request**.

Supported harnesses: **codex** (OpenAI Codex CLI), **cursor** (cursor-agent),
and **claude** (Claude Code CLI).

## What it does

For one invocation (`solve run --eval <slug> --harness <id>`) it:

1. Spins up a fresh Daytona sandbox and explicitly enables full outbound
   internet access.
2. Installs the chosen agent CLI inside the sandbox.
3. Clones this repo at the base branch and checks out a new solution branch.
4. Writes a prompt that combines the eval's `README.md` with the repo's
   submission conventions (from `AGENTS.md`) and the exact solution slug.
5. Runs the agent **headlessly** with permissions to edit files and run shell
   commands.
6. Runs `node scripts/validate-content.mjs`, commits the changes, pushes the
   branch, and opens a **draft pull request** against the base branch.
7. Deletes the sandbox (kept automatically if the run fails or `--keep-sandbox`).

The agent itself only authors the solution files + `docs/data.json` entry; the
CLI handles git + the PR so behavior is consistent across all three harnesses.

## Setup

This is a self-contained package — its dependencies are **not** part of the
Next.js site. From the repo root:

```bash
cd solver
npm install
```

Then create a `.env` (see [`.env.example`](./.env.example)). Put it at the **repo
root** (preferred) or in `solver/`. Required:

- `DAYTONA_API_KEY` — Daytona credentials.
- One agent key for the harness you run: `OPENAI_API_KEY` (codex),
  `CURSOR_API_KEY` (cursor), or `ANTHROPIC_API_KEY` (claude).
- `GITHUB_TOKEN` (or `GH_TOKEN`) — to push the branch and open the PR. Without
  it, the solution is built in the sandbox but not pushed (and the sandbox is
  kept for inspection).

## Usage

```bash
# From the solver/ directory
node bin/solve.mjs run --eval evading-demons --harness codex --model gpt-5-codex
node bin/solve.mjs run --eval sweats-dossier --harness claude --model opus
node bin/solve.mjs run --eval life-sim       --harness cursor

# Helpers
node bin/solve.mjs evals        # list eval slugs
node bin/solve.mjs harnesses    # list harnesses + default models
node bin/solve.mjs --help

# Preview the plan + full prompt without touching Daytona
node bin/solve.mjs run --eval evading-demons --harness codex --dry-run
```

### Key options

| Flag | Description |
|---|---|
| `--eval <slug>` | (required) eval folder slug |
| `--harness <id>` | (required) `codex` \| `cursor` \| `claude` |
| `--model <name>` | model for the harness (each has a sensible default) |
| `--solution-slug <slug>` | override the solution dir/registry slug (default `<harness>-<model>`) |
| `--branch <name>` | override the pushed branch name |
| `--base-branch <name>` | base branch to clone / target (default `main`) |
| `--owner` / `--repo-name` | override the GitHub repo (default from `docs/data.json`) |
| `--snapshot <name>` | Daytona snapshot to base the sandbox on |
| `--timeout <seconds>` | max agent run time (default `3600`) |
| `--no-push` | build only; don't push or open a PR |
| `--no-pr` | push the branch but don't open a PR |
| `--no-draft` | open the PR ready-for-review instead of draft |
| `--keep-sandbox` | don't delete the sandbox when finished |
| `--dry-run` | print the plan + prompt and exit |

Set `SOLVER_DEBUG=1` to print stack traces on error.

## How the harnesses are invoked

All run non-interactively with file/shell mutation enabled (safe because the
sandbox is a disposable microVM with full network):

- **codex:** `codex exec --dangerously-bypass-approvals-and-sandbox [--model …]`
- **cursor:** `cursor-agent -p --force --trust [--model …]`
- **claude:** `claude -p --dangerously-skip-permissions [--model …]`

The prompt is passed as a single argument via `"$(cat <file>)"`, so arbitrary
prompt content is forwarded verbatim with no shell-escaping issues.

## Notes / future work

This is the manual, single-invocation building block. The intended next step is
to trigger it automatically when a new eval is merged, fanning out across a set
of harness/model configurations.
