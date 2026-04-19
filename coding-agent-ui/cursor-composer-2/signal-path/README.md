# signal-path

A small coding agent with a browser chat UI. Built for the [`coding-agent-ui`](../../README.md) eval (**cursor-composer-2**).

- **Harness:** Cursor
- **Model:** OpenAI Chat Completions (default `gpt-4o`) — override with `CC2_MODEL`
- **Stack:** Python 3.10+ · FastAPI · WebSockets · vanilla JS frontend (no build step)

The agent exposes:

- `bash` — run a shell command in the working directory.
- `read_file` — read a file (optional line range).
- `write_file` — overwrite / create a file.
- `edit_file` — exact string replacement in a file.
- `list_dir` — list a directory.

Assistant text and tool use stream to the browser so you can follow the run in real time.

## Run it

Requires Python 3.10+ and an OpenAI API key (`OPENAI_API_KEY`).

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY=sk-...
# Optional: directory the agent’s tools use (defaults to cwd at launch).
export CC2_WORKDIR="$PWD/../scratch"
mkdir -p "$CC2_WORKDIR"

python -m cc2
```

Open http://localhost:8765 in your browser and start chatting.

## Configuration

| Env var | Default | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | *required* | Your OpenAI API key. |
| `CC2_MODEL` | `gpt-4o` | Any chat model that supports parallel function calling. |
| `CC2_WORKDIR` | `$PWD` | Working directory for tools. The agent can still reach outside via `bash`. |
| `CC2_PORT` | `8765` | HTTP/WebSocket port. |
| `CC2_MAX_TURNS` | `40` | Max tool rounds per user message. |

## Warnings

The agent has **real shell and filesystem access** on your machine. There is no sandbox. Run it only where you accept that risk.

## Layout

```
signal-path/
├── README.md
├── backend/
│   ├── requirements.txt
│   └── cc2/
│       ├── __init__.py
│       ├── __main__.py
│       ├── server.py
│       ├── agent.py
│       └── tools.py
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```
