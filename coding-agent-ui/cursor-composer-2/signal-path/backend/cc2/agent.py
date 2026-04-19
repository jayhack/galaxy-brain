"""Agent loop: OpenAI Chat Completions streaming + tools, same wire events as ez-claw."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Awaitable, Callable

from openai import AsyncOpenAI

from .tools import ToolError, openai_tools, run_tool

EmitFn = Callable[[dict[str, Any]], Awaitable[None]]

SYSTEM_PROMPT = """You are signal-path, a coding agent running on the user's local machine.

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
        self.client = AsyncOpenAI()
        self.history: list[dict[str, Any]] = []
        self.system = SYSTEM_PROMPT.format(workdir=str(workdir))
        self._tools = openai_tools()

    def _api_messages(self) -> list[dict[str, Any]]:
        return [{"role": "system", "content": self.system}, *self.history]

    async def send(self, user_text: str, emit: EmitFn) -> None:
        self.history.append({"role": "user", "content": user_text})

        for _ in range(self.max_turns):
            pending_tc: dict[int, dict[str, str]] = {}
            started: set[str] = set()
            assistant_text = ""

            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=self._api_messages(),
                tools=self._tools,
                stream=True,
                temperature=0.2,
            )

            finish_reason: str | None = None
            async for chunk in stream:
                ch0 = chunk.choices[0] if chunk.choices else None
                if not ch0:
                    continue
                if ch0.finish_reason:
                    finish_reason = ch0.finish_reason
                delta = ch0.delta
                if delta.content:
                    assistant_text += delta.content
                    await emit({"type": "text_delta", "text": delta.content})
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        slot = pending_tc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                        if tc.id:
                            slot["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                slot["name"] = tc.function.name
                            if tc.function.arguments:
                                slot["arguments"] += tc.function.arguments
                        if slot.get("id") and slot.get("name") and slot["id"] not in started:
                            started.add(slot["id"])
                            await emit(
                                {
                                    "type": "tool_call_start",
                                    "id": slot["id"],
                                    "name": slot["name"],
                                }
                            )

            if assistant_text:
                await emit({"type": "text_end"})

            ordered = [pending_tc[i] for i in sorted(pending_tc.keys()) if pending_tc[i].get("name")]
            tool_calls_payload: list[dict[str, Any]] = []
            for slot in ordered:
                tid = slot.get("id") or ""
                raw_args = slot.get("arguments") or "{}"
                try:
                    parsed: Any = json.loads(raw_args) if raw_args.strip() else {}
                except json.JSONDecodeError:
                    parsed = {"_raw": raw_args}
                tool_calls_payload.append(
                    {
                        "id": tid,
                        "type": "function",
                        "function": {"name": slot["name"], "arguments": raw_args},
                    }
                )
                await emit(
                    {
                        "type": "tool_call_input",
                        "id": tid,
                        "name": slot["name"],
                        "input": parsed,
                    }
                )

            assistant_msg: dict[str, Any] = {
                "role": "assistant",
                "content": assistant_text if assistant_text else None,
            }
            if tool_calls_payload:
                assistant_msg["tool_calls"] = tool_calls_payload
            self.history.append(assistant_msg)

            if finish_reason != "tool_calls" or not ordered:
                await emit({"type": "turn_done", "stop_reason": finish_reason or "stop"})
                return

            for slot in ordered:
                tid = slot.get("id") or ""
                name = slot.get("name") or ""
                raw_args = slot.get("arguments") or "{}"
                try:
                    args = json.loads(raw_args) if raw_args.strip() else {}
                except json.JSONDecodeError:
                    args = {}
                try:
                    result = await run_tool(self.workdir, name, args)
                    is_error = False
                except ToolError as e:
                    result = f"[tool error] {e}"
                    is_error = True
                await emit(
                    {
                        "type": "tool_result",
                        "id": tid,
                        "name": name,
                        "is_error": is_error,
                        "content": result,
                    }
                )
                self.history.append({"role": "tool", "tool_call_id": tid, "content": result})

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
    workdir = Path(os.environ.get("CC2_WORKDIR", os.getcwd())).resolve()
    workdir.mkdir(parents=True, exist_ok=True)
    model = os.environ.get("CC2_MODEL", "gpt-4o")
    max_turns = int(os.environ.get("CC2_MAX_TURNS", "40"))
    return Agent(workdir=workdir, model=model, max_turns=max_turns)
