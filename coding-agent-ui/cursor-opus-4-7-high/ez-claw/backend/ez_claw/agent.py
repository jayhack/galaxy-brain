"""Agent loop: streams tokens + tool calls back through an async callback."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Awaitable, Callable

from anthropic import AsyncAnthropic

from .tools import TOOL_SCHEMAS, ToolError, run_tool

EmitFn = Callable[[dict[str, Any]], Awaitable[None]]


SYSTEM_PROMPT = """You are ez-claw, a coding agent running on the user's local machine.

You have full access to a working directory ({workdir}) via shell and file tools.
Be terse, decisive, and execute. Prefer using tools over asking clarifying
questions. When you finish a task, summarize what you did in 1-3 short sentences.

Tool guidance:
- Use `bash` for anything involving running programs, git, package managers, etc.
- Use `read_file` / `write_file` / `edit_file` for surgical file work.
- Use `list_dir` to orient yourself in unfamiliar directories.

Current working directory: {workdir}
"""


class Agent:
    def __init__(self, workdir: Path, model: str, max_turns: int = 40) -> None:
        self.workdir = workdir
        self.model = model
        self.max_turns = max_turns
        self.client = AsyncAnthropic()
        self.history: list[dict[str, Any]] = []
        self.system = SYSTEM_PROMPT.format(workdir=str(workdir))

    async def send(self, user_text: str, emit: EmitFn) -> None:
        """Process one user turn, emitting events as the agent works."""
        self.history.append({"role": "user", "content": user_text})

        for turn in range(self.max_turns):
            assistant_blocks: list[dict[str, Any]] = []
            current_text_idx: int | None = None
            tool_inputs: dict[int, str] = {}  # block_idx -> partial json
            tool_meta: dict[int, dict[str, Any]] = {}  # block_idx -> {id, name}

            stream_kwargs: dict[str, Any] = {
                "model": self.model,
                "max_tokens": 4096,
                "system": self.system,
                "tools": TOOL_SCHEMAS,
                "messages": self.history,
            }

            async with self.client.messages.stream(**stream_kwargs) as stream:
                async for event in stream:
                    et = event.type

                    if et == "content_block_start":
                        block = event.content_block
                        idx = event.index
                        if block.type == "text":
                            current_text_idx = idx
                            assistant_blocks.append({"type": "text", "text": ""})
                        elif block.type == "tool_use":
                            tool_meta[idx] = {"id": block.id, "name": block.name}
                            tool_inputs[idx] = ""
                            assistant_blocks.append(
                                {
                                    "type": "tool_use",
                                    "id": block.id,
                                    "name": block.name,
                                    "input": {},
                                }
                            )
                            await emit(
                                {
                                    "type": "tool_call_start",
                                    "id": block.id,
                                    "name": block.name,
                                }
                            )

                    elif et == "content_block_delta":
                        d = event.delta
                        if d.type == "text_delta":
                            if current_text_idx is not None:
                                assistant_blocks[current_text_idx]["text"] += d.text
                            await emit({"type": "text_delta", "text": d.text})
                        elif d.type == "input_json_delta":
                            tool_inputs[event.index] = (
                                tool_inputs.get(event.index, "") + d.partial_json
                            )

                    elif et == "content_block_stop":
                        idx = event.index
                        if idx in tool_inputs:
                            raw = tool_inputs[idx] or "{}"
                            try:
                                parsed = json.loads(raw)
                            except json.JSONDecodeError:
                                parsed = {"_raw": raw}
                            assistant_blocks[idx]["input"] = parsed
                            await emit(
                                {
                                    "type": "tool_call_input",
                                    "id": tool_meta[idx]["id"],
                                    "name": tool_meta[idx]["name"],
                                    "input": parsed,
                                }
                            )
                        elif idx == current_text_idx:
                            current_text_idx = None
                            await emit({"type": "text_end"})

                    elif et == "message_stop":
                        pass

                final = await stream.get_final_message()

            self.history.append({"role": "assistant", "content": assistant_blocks})

            tool_uses = [b for b in assistant_blocks if b["type"] == "tool_use"]
            if final.stop_reason != "tool_use" or not tool_uses:
                await emit({"type": "turn_done", "stop_reason": final.stop_reason})
                return

            tool_results: list[dict[str, Any]] = []
            for tu in tool_uses:
                try:
                    result = await run_tool(self.workdir, tu["name"], tu["input"])
                    is_error = False
                except ToolError as e:
                    result = f"[tool error] {e}"
                    is_error = True

                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tu["id"],
                        "content": result,
                        "is_error": is_error,
                    }
                )
                await emit(
                    {
                        "type": "tool_result",
                        "id": tu["id"],
                        "name": tu["name"],
                        "is_error": is_error,
                        "content": result,
                    }
                )

            self.history.append({"role": "user", "content": tool_results})

        await emit(
            {
                "type": "turn_done",
                "stop_reason": "max_turns",
                "note": f"hit max_turns={self.max_turns}",
            }
        )

    def reset(self) -> None:
        self.history = []


def make_agent() -> Agent:
    workdir = Path(os.environ.get("EZ_CLAW_WORKDIR", os.getcwd())).resolve()
    workdir.mkdir(parents=True, exist_ok=True)
    model = os.environ.get("EZ_CLAW_MODEL", "claude-opus-4-5")
    max_turns = int(os.environ.get("EZ_CLAW_MAX_TURNS", "40"))
    return Agent(workdir=workdir, model=model, max_turns=max_turns)
