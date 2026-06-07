# galaxy-brain solver workflow app

This is the deployable Workflow/Next.js surface for running eval solvers in Vercel Sandbox. It is separate from the static results site in the repo root, which keeps `output: "export"` intact.

## What it does

`POST /api/solve` starts one Vercel Workflow run. The workflow fans out across the requested harness configs. Each real solve:

1. Creates a `node24` Vercel Sandbox.
2. Clones `galaxy-brain` from `main` onto a fresh branch.
3. Builds a prompt from `AGENTS.md`, the eval `README.md`, and the target solution slug.
4. Starts the selected agent as a detached sandbox command.
5. Polls a sentinel exit-code file with `sleep()` between short status steps.
6. Runs `node scripts/validate-content.mjs`.
7. Commits only allowlisted solution files.
8. Pushes the branch and opens a draft GitHub PR.

Supported harness commands:

- `codex exec --dangerously-bypass-approvals-and-sandbox --model <model> -`
- `cursor-agent -p --force --trust --model <model> "<prompt>"`
- `claude -p --dangerously-skip-permissions --model <model> "<prompt>"`

## Environment

Copy `.env.example` to `.env.local` for local development or configure the same variables in Vercel.

Required for dry runs:

- No provider keys are required.
- Either run from this nested `workflow-app/` directory so `..` points at the repo root, set `GALAXY_BRAIN_LOCAL_REPO_PATH`, or set `GALAXY_BRAIN_REPO_URL`.

Required for real sandbox runs:

- `GALAXY_BRAIN_REPO_URL`
- `GITHUB_TOKEN` with permission to push a branch and open pull requests.
- One provider key matching the harness: `OPENAI_API_KEY`, `CURSOR_API_KEY`, or `ANTHROPIC_API_KEY`.
- In production, Vercel OIDC is automatic. Locally, set `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`.

## Local run

From this directory:

```bash
npm install
npm run dev
```

In another terminal, open the Workflow dashboard:

```bash
npx workflow web
```

Dry-run request, which builds the prompt without creating a sandbox:

```bash
curl -X POST http://127.0.0.1:3000/api/solve \
  -H 'content-type: application/json' \
  --data '{
    "eval": "evading-demons",
    "dryRun": true,
    "configs": [
      { "harness": "codex", "model": "gpt-5-codex" }
    ]
  }'
```

Check run status:

```bash
curl http://127.0.0.1:3000/api/runs/<runId>
```

Stream workflow events:

```bash
curl -N http://127.0.0.1:3000/api/runs/<runId>/events
```

## Real solve request

```bash
curl -X POST https://<workflow-app-domain>/api/solve \
  -H 'content-type: application/json' \
  --data '{
    "eval": "evading-demons",
    "configs": [
      { "harness": "codex", "model": "gpt-5-codex" },
      { "harness": "cursor", "model": "gpt-5" },
      { "harness": "claude", "model": "claude-opus-4-7" }
    ]
  }'
```

Optional request fields:

- `repoUrl`: overrides `GALAXY_BRAIN_REPO_URL`.
- `baseBranch`: defaults to `GALAXY_BRAIN_BASE_BRANCH` or `main`.
- `prBaseBranch`: defaults to `baseBranch`.
- `sandboxTimeoutMs`: defaults to `SOLVER_SANDBOX_TIMEOUT_MS` or 2 hours.
- `pollIntervalMs`: defaults to `SOLVER_POLL_INTERVAL_MS` or 60 seconds.
- `maxPolls`: defaults to `ceil(sandboxTimeoutMs / pollIntervalMs) + 5`.
- `localRepoPath`: dry-run local prompt source.
- `configs[].solutionSlug`: overrides the default `<harness>-<model>` slug.
- `configs[].promptSuffix`: appends one-off instructions to the generated prompt.

## Deploy to Vercel

Create a separate Vercel project with root directory set to `workflow-app/`. Do not point this project at the repository root, because the root app is the static results site.

Configure the environment variables from `.env.example`. The project should use the default Next.js build command:

```bash
npm run build
```

The production endpoint is:

```text
POST https://<workflow-app-domain>/api/solve
```
