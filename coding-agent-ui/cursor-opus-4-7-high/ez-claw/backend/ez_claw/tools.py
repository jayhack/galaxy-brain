"""Tool implementations for the agent.

Each tool returns a string result that is fed back to the model as the
`tool_result` content block. We deliberately keep results plain text so the
UI can render them in a `<pre>` block.
"""

from __future__ import annotations

import asyncio
import os
import shlex
from pathlib import Path
from typing import Any

# Anthropic-style JSONSchema definitions for tool use.
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "bash",
        "description": (
            "Execute a shell command in the working directory and return its "
            "combined stdout/stderr. Commands run with the user's shell "
            "(`/bin/bash -lc`). There is a 120s timeout."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute.",
                },
                "timeout_seconds": {
                    "type": "integer",
                    "description": "Optional timeout in seconds (default 120, max 600).",
                },
            },
            "required": ["command"],
        },
    },
    {
        "name": "read_file",
        "description": (
            "Read a UTF-8 text file from disk. Optionally restrict to a line "
            "range (1-indexed, inclusive)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "start_line": {"type": "integer"},
                "end_line": {"type": "integer"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": (
            "Create or overwrite a UTF-8 text file. Parent directories are "
            "created automatically."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "edit_file",
        "description": (
            "Replace one exact occurrence of `old_string` with `new_string` in "
            "the file at `path`. Fails if `old_string` is missing or appears "
            "more than once."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_string": {"type": "string"},
                "new_string": {"type": "string"},
            },
            "required": ["path", "old_string", "new_string"],
        },
    },
    {
        "name": "list_dir",
        "description": "List entries in a directory (non-recursive).",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Defaults to '.'"},
            },
            "required": [],
        },
    },
]


class ToolError(Exception):
    pass


def _resolve(workdir: Path, raw: str) -> Path:
    p = Path(raw)
    if not p.is_absolute():
        p = workdir / p
    return p


async def _bash(workdir: Path, command: str, timeout_seconds: int = 120) -> str:
    timeout_seconds = max(1, min(int(timeout_seconds), 600))
    proc = await asyncio.create_subprocess_exec(
        "/bin/bash",
        "-lc",
        command,
        cwd=str(workdir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise ToolError(f"command timed out after {timeout_seconds}s: {command}")

    text = stdout.decode("utf-8", errors="replace")
    rc = proc.returncode
    header = f"$ {command}\n[exit {rc}]\n"
    # Truncate noisy output.
    if len(text) > 16_000:
        text = text[:16_000] + f"\n... [truncated {len(text) - 16_000} chars]"
    return header + text


def _read_file(workdir: Path, path: str, start_line: int | None = None, end_line: int | None = None) -> str:
    target = _resolve(workdir, path)
    data = target.read_text(encoding="utf-8", errors="replace")
    lines = data.splitlines()
    if start_line is not None or end_line is not None:
        s = max(1, start_line or 1)
        e = min(len(lines), end_line or len(lines))
        lines = lines[s - 1 : e]
        prefix_start = s
    else:
        prefix_start = 1
    width = len(str(prefix_start + len(lines) - 1))
    numbered = "\n".join(f"{(i + prefix_start):>{width}} | {ln}" for i, ln in enumerate(lines))
    return f"{target}\n{numbered}"


def _write_file(workdir: Path, path: str, content: str) -> str:
    target = _resolve(workdir, path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"wrote {len(content)} bytes to {target}"


def _edit_file(workdir: Path, path: str, old_string: str, new_string: str) -> str:
    target = _resolve(workdir, path)
    data = target.read_text(encoding="utf-8")
    count = data.count(old_string)
    if count == 0:
        raise ToolError(f"old_string not found in {target}")
    if count > 1:
        raise ToolError(
            f"old_string appears {count} times in {target}; provide more "
            f"surrounding context so it is unique."
        )
    target.write_text(data.replace(old_string, new_string, 1), encoding="utf-8")
    return f"edited {target} (1 replacement)"


def _list_dir(workdir: Path, path: str = ".") -> str:
    target = _resolve(workdir, path)
    if not target.is_dir():
        raise ToolError(f"not a directory: {target}")
    rows = []
    for entry in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        kind = "dir " if entry.is_dir() else "file"
        try:
            size = entry.stat().st_size if entry.is_file() else "-"
        except OSError:
            size = "?"
        rows.append(f"{kind}  {size!s:>10}  {entry.name}")
    return f"{target}\n" + "\n".join(rows)


async def run_tool(workdir: Path, name: str, args: dict[str, Any]) -> str:
    """Dispatch a tool call. Returns a string result; raises ToolError on failure."""
    try:
        if name == "bash":
            return await _bash(workdir, **args)
        if name == "read_file":
            return _read_file(workdir, **args)
        if name == "write_file":
            return _write_file(workdir, **args)
        if name == "edit_file":
            return _edit_file(workdir, **args)
        if name == "list_dir":
            return _list_dir(workdir, **args)
    except ToolError:
        raise
    except TypeError as e:
        raise ToolError(f"bad arguments for {name}: {e}") from e
    except FileNotFoundError as e:
        raise ToolError(f"file not found: {e}") from e
    except Exception as e:  # surface anything else as a tool error
        raise ToolError(f"{type(e).__name__}: {e}") from e
    raise ToolError(f"unknown tool: {name}")
