# ez-claw

A tiny coding agent with a browser chat UI. Built for the [`coding-agent-ui`](../../README.md) eval.

- **Harness:** Cursor
- **Model:** `claude-opus-4-5` (Anthropic) — swap via `EZ_CLAW_MODEL`
- **Stack:** Python 3.10+ · FastAPI · WebSockets · vanilla JS frontend (no build step)

The agent has these tools:

- `bash` — run a shell command in the working directory.
- `read_file` — read a file (with optional line range).
- `write_file` — overwrite / create a file.
- `edit_file` — exact string replacement in a file.
- `list_dir` — list a directory.

Tool use streams live to the browser so you can watch the agent think and act.

## Run it

Requires Python 3.10+ and an Anthropic API key.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...
# Optional: pin which directory the agent's tools operate in.
# Defaults to the current working directory at launch.
export EZ_CLAW_WORKDIR="$PWD/../scratch"
mkdir -p "$EZ_CLAW_WORKDIR"

python -m ez_claw
```

Then open http://localhost:8765 in your browser and start chatting.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | *required* | Your Anthropic key. |
| `EZ_CLAW_MODEL` | `claude-opus-4-5` | Any Anthropic model with tool use. |
| `EZ_CLAW_WORKDIR` | `$PWD` | Sandbox-ish working dir for the agent's tools. The agent can still escape via shell — see warnings. |
| `EZ_CLAW_PORT` | `8765` | HTTP/WS port. |
| `EZ_CLAW_MAX_TURNS` | `40` | Max tool-use iterations per user message. |

## Warnings

The agent has **real shell and filesystem access** on your machine. There is no sandbox. Run it under an account / in a directory you're comfortable with. You were warned.

## Layout

```
ez-claw/
├── README.md
├── backend/
│   ├── requirements.txt
│   └── ez_claw/
│       ├── __init__.py
│       ├── __main__.py
│       ├── server.py        # FastAPI + WebSocket
│       ├── agent.py         # Anthropic tool-use loop
│       └── tools.py         # bash / read / write / edit / list
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```
