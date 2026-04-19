# galaxy-brain

A collection of agent evals.

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

## Submitting a solution

1. Fork or branch.
2. Add a directory `<eval-name>/<harness>-<model>/` with your solution.
3. Include a short `README.md` at the root of your solution explaining how to run it.
4. Open a PR. PRs are merged once the solution runs and meets the prompt's acceptance criteria.

## Evals

| Eval | Description |
|---|---|
| [`coding-agent-ui`](./coding-agent-ui) | Build a local app that runs a coding agent in the background with access to your computer, exposed via a chat UI in the browser. |
