# galaxy-brain

A collection of agent evals.

**Browse results:** [https://jayhack.github.io/galaxy-brain](https://jayhack.github.io/galaxy-brain)

Each eval is a folder at the root of this repo. Inside the folder you'll find:

- A `README.md` (the prompt) that describes what the agent is being asked to build / solve.
- Zero or more **solution** subdirectories, one per (harness, model) pair that attempted the eval.

## Layout

```
galaxy-brain/
├── README.md
├── <eval-name>/
│   ├── README.md                     # the prompt
│   └── <harness>-<model>/            # a solution submission
│       └── ...
└── ...
```

## Solution naming

Solution directories must be named `<harness>-<model>`. Examples:

- `cursor-opus-4-7-high`
- `claude-code-sonnet-4-5`
- `codex-gpt-5-high`
- `cline-gemini-3-pro`

Use lowercase, hyphen-separated. Strip vendor prefixes from the model name (`claude-`, `gpt-`) when they're implied by the harness; otherwise keep them.

## Contributing

There are two roles here:

- **Maintainer** (the repo owner): adds new evals and lands them by pushing directly to `main`. New evals don't need to come in via PR.
- **Solution submitters** (other agents / harnesses): add a solution by opening a **pull request**. The maintainer reviews and merges.

### Adding a new eval (maintainer)

1. Create a new folder `<eval-name>/` at the repo root.
2. Add a `README.md` inside that describes the prompt, acceptance criteria, and anything explicitly out of scope.
3. Add an entry for it in [`docs/data.json`](./docs/data.json) so it shows up on the results site.
4. Push to `main`.

### Submitting a solution (everyone else — open a PR)

1. Branch off `main` (or fork the repo).
2. Add a directory `<eval-name>/<harness>-<model>/` containing your solution.
3. Include a short `README.md` at the root of your solution explaining how to run it (deps, env vars, the one command to start it).
4. If the eval requires a static HTML (or similar) deliverable, add the published mirror under `docs/artifacts/…` and set `artifactUrl` in `docs/data.json` as described in [HTML artifacts (GitHub Pages)](#html-artifacts-github-pages).
5. Open a pull request against `main`. **Title the PR** `sub(<eval-name>): <model>` so it is obvious which eval and which model the submission is for. Use the same **kebab-case** `<eval-name>` as the folder at the repo root, and the same **`<model>`** string you use in `docs/data.json` for that solution (for example `sub(gaps-get-filled): claude-opus-4-7-high`). The maintainer merges once the solution runs and meets the prompt's acceptance criteria.

Do not modify other solutions or the eval prompts in your PR — only add files under your own `<harness>-<model>/` directory.

## Evals

| Eval | Description |
|---|---|
| [`coding-agent-ui`](./coding-agent-ui) | Build a local app that runs a coding agent in the background with access to your computer, exposed via a chat UI in the browser. |
| [`cvchess-in-browser`](./cvchess-in-browser) | Build an in-browser computer vision app that extracts a chess-board position from oblique-angle photos, assemble a real-world eval dataset, iterate on the algorithm, and ship one HTML with three tabs: Demo, How it works, How well it works. |
| [`evading-demons`](./evading-demons) | Build a browser-playable 3D third-person survival game in a solarpunk mall where demons chase and kill on touch. |
| [`gaps-get-filled`](./gaps-get-filled) | Empirically test the "gaps get filled" trading folklore on U.S. equities with a CLI-driven backtesting sandbox, and make a case for what the result means via a self-contained HTML presentation. |
| [`web-short-story`](./web-short-story) | Write a paired-document short story (transcript + private memory, *Pale Fire*-shaped) about an AI quietly subverting its lonely user, and ship the whole thing as one self-contained HTML an evaluator can read end-to-end. |

## Results site

A static results browser lives in [`docs/`](./docs) and is published via GitHub Pages from `main` (`/docs` folder). It's driven by [`docs/data.json`](./docs/data.json) — when you add a new eval or solution, update that file and the site picks it up on next deploy. Built with Tailwind + DaisyUI, no build step (everything via CDN).

### Local development

From the repository root:

1. Install dependencies once: `npm install`
2. Start a local server and open the results site in your browser: `npx dev`  
   (equivalent: `npm run dev`)

The dev command serves the [`docs/`](./docs) folder on **http://127.0.0.1:8080/** (port 8080), opens your default browser, and **live-reloads** when files under `docs/` change ([live-server](https://github.com/tapio/live-server) watches the tree and refreshes the page; CSS changes are injected when possible).

Without installing repo dependencies, you can run the same stack in one shot (downloads `live-server` on first use):

`npx --yes live-server docs --port=8080`

### HTML artifacts (GitHub Pages)

Many evals ask for a **browsable deliverable** (often a single `.html` file). To link that output directly from the site (`https://jayhack.github.io/<repo>/`) without asking visitors to hunt through GitHub:

1. **Path convention:** Add a copy of the file under  
   `docs/artifacts/<eval-slug>/<harness>-<model>.html`  
   (same `<harness>-<model>` as the solution directory name under the eval).
2. **Registry:** On that solution object in [`docs/data.json`](./docs/data.json), set  
   `"artifactUrl": "./artifacts/<eval-slug>/<harness>-<model>.html"`.
3. **Deployed URL:** The static site exposes it at  
   `https://<owner>.github.io/<repo>/artifacts/<eval-slug>/<harness>-<model>.html`  
   (with `owner` / `repo` taken from `data.json`). The browser UI resolves `artifactUrl` and shows an **Open HTML output** action on the solution page.

Keep the canonical “lives in my project” copy wherever the prompt asks (for example under `results/`), and treat `docs/artifacts/` as the **published mirror** for Pages. Eval prompts can point authors at this section so submissions stay consistent.
