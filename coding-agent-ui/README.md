# coding-agent-ui

## Prompt

Build an application I can run locally that:

1. Runs a **coding agent** in the background that has access to my local computer (read/write files, execute shell commands).
2. Exposes a **chat interface in the browser** so I can talk to that agent and watch it work.

That's the whole task. You pick the stack, the model provider, the agent loop design, the UI, and how much polish to add.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the solution's `README.md`.
2. Start the app with a single command (or a short, documented sequence) using only:
  - A package manager (e.g. `pip`, `uv`, `npm`, `pnpm`, `bun`, `cargo`, `go`).
  - Environment variables for any API keys (documented in the README).
3. Open a browser tab to a local URL and have a working chat with the agent.
4. Give the agent a non-trivial coding task (e.g. *"create a new directory called `scratch` in this repo, write a Python script that prints the first 20 primes, run it, and show me the output"*) and watch it:
  - Stream tokens / thinking back to the UI.
  - Call tools that touch the local filesystem and shell.
  - Show what tools it called and what they returned.
  - Produce the requested artifact on disk.

## Out of scope (don't waste time on these)

- Auth, multi-user, accounts.
- Persistence across restarts (in-memory chat history is fine).
- Sandboxing / security hardening — we trust the operator's machine.
- Mobile UI.

## Notes for evaluators

Solutions live under `<harness>-<model>/` subdirectories. Each is self-contained.

Current solutions:

- `[cursor-opus-4-7-high/](./cursor-opus-4-7-high)` — Cursor + Claude Opus 4.7 (high). Project name: **ez-claw**.