---
name: galaxy-brain-evals
description: How to add and publish a galaxy-brain agent eval (folder layout, README prompt, docs/data.json, HTML artifacts). Use when authoring evals in the galaxy-brain repo or helping others do the same.
---

# Galaxy-brain: authoring an eval

This skill describes how **evals** work in the [galaxy-brain](https://github.com/jayhack/galaxy-brain) repo: a root-level folder per eval, a prompt in `README.md`, optional solution submissions, and registration on the static results site via `docs/data.json`.

## Repo you are working in

Treat the **galaxy-brain repository root** as the canonical location. On your machine, that is whatever path you cloned the repo to, for example:

`/path/to/galaxy-brain`

The in-repo copy of this skill lives at:

`.cursor/skills/galaxy-brain-evals/SKILL.md`

(Under that path, `SKILL.md` is the filename Cursor expects.)

## Install as a global Cursor skill

Cursor loads **user-level** skills from `~/.cursor/skills/`. Each skill is a **directory** whose name matches the skill `name` in the frontmatter, containing `SKILL.md`.

### Option A — Symlink (stays in sync with the repo)

```bash
mkdir -p ~/.cursor/skills
ln -sfn /path/to/galaxy-brain/.cursor/skills/galaxy-brain-evals ~/.cursor/skills/galaxy-brain-evals
```

Replace `/path/to/galaxy-brain` with your actual clone path.

### Option B — Copy (snapshot)

```bash
mkdir -p ~/.cursor/skills
rm -rf ~/.cursor/skills/galaxy-brain-evals
cp -R /path/to/galaxy-brain/.cursor/skills/galaxy-brain-evals ~/.cursor/skills/
```

After installing, **restart Cursor** (or reload the window) so the skill is picked up. In Agent chat you can invoke it via `/` and search for `galaxy-brain-evals`, same idea as other global skills (e.g. a `warehouse-traces`-style skill in your own `~/.cursor/skills/`).

## What an “eval” is here

- One **eval** = one directory at the **repository root**, e.g. `evading-demons/`.
- The eval’s **`README.md`** is the **prompt**: what agents must build and how judges check it.
- **Solutions** live in nested folders named `<harness>-<model>/` (see below); those are usually added via PR by submitters, not by the eval author for every new eval.

## Layout (maintainer: new eval)

1. Create `<eval-name>/` at the repo root (kebab-case slug, matches what you will put in `docs/data.json`).
2. Add `<eval-name>/README.md` with a clear structure (see below).
3. Add an entry for the eval in `docs/data.json` so it appears on the GitHub Pages results site (`evals` array: `slug`, `title`, `tagline`, `description`, `tags`, `createdAt`, `solutions` — often `[]` at first).
4. Push to `main` (new evals do not have to go through a PR in this repo’s workflow).

Cross-check the canonical overview in the root **`README.md`** (“Layout”, “Contributing”, “HTML artifacts”).

## Eval `README.md` content (recommended sections)

Mirror existing evals (e.g. `evading-demons`, `gaps-get-filled`, `web-short-story`):

1. **Title** — H1 with the eval slug or human name.
2. **Prompt** — Numbered or bulleted requirements; say what must be **committed** (e.g. a playable `.html`) and what stack is allowed.
3. **Acceptance criteria** — Ordered checklist a **fresh evaluator** can follow without tribal knowledge (clone → `cd` → open file / run one command → verify behaviors).
4. **Out of scope** — What agents should not spend time on.
5. **Notes for evaluators** (optional) — Intent, known tradeoffs, or judging emphasis.

Keep acceptance criteria **testable** and **offline-friendly** when possible (e.g. “open this HTML in a browser” beats “sign up for a service”).

## Results site: `docs/data.json`

- File: `docs/data.json` (driven by `repo.owner`, `repo.name`, `repo.branch` for GitHub Pages URLs).
- Each eval is one object in `evals`. Use the same **`slug`** as the folder name.
- When solutions exist, each solution object uses **`slug`** equal to the directory name under the eval (e.g. `cursor-opus-4-7-high`), plus fields like `harness`, `model`, `summary`, `tech`, `submittedAt`, `outcome`, and optionally **`artifactUrl`** for static HTML mirrors.

## HTML artifacts (optional but common)

If the prompt requires a **browsable deliverable** (often a single `.html`):

1. Published mirror path: `docs/artifacts/<eval-slug>/<harness>-<model>.html`
2. On the solution entry in `docs/data.json`, set `"artifactUrl": "./artifacts/<eval-slug>/<harness>-<model>.html"`

The root **`README.md`** section **“HTML artifacts (GitHub Pages)”** has the full convention and URL shape.

## Solution directory naming (for submitters)

Solutions go under `<eval-name>/<harness>-<model>/`, lowercase, hyphen-separated. Examples: `cursor-opus-4-7-high`, `claude-code-sonnet-4-5`, `codex-gpt-5-high`. Strip redundant vendor prefixes when the harness already implies them.

Submitters add **only** their solution tree; they should not rewrite the eval prompt or other people’s solutions.

## Quick checklist

- [ ] New root folder `<eval-name>/` with `README.md` (prompt + acceptance + scope).
- [ ] New `evals[]` entry in `docs/data.json` with matching `slug`.
- [ ] If HTML is required, document the artifact path convention for submitters in the eval README or point to the root README.
- [ ] Results site: verify `docs/index.html` + `docs/data.json` after deploy if you care about the browser UI.

## See also

- Repository root **`README.md`** — full layout, contributing, artifacts.
- Existing eval folders at repo root — copy tone and structure from the closest task type (game, data/CLI, narrative HTML, etc.).
