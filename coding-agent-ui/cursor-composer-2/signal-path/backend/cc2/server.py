"""FastAPI app: serves the static UI and a single websocket per chat session."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .agent import make_agent

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"

app = FastAPI(title="signal-path")


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")


@app.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await websocket.accept()

    agent = make_agent()
    await websocket.send_json(
        {
            "type": "hello",
            "model": agent.model,
            "workdir": str(agent.workdir),
        }
    )

    send_lock = asyncio.Lock()

    async def emit(event: dict) -> None:
        async with send_lock:
            await websocket.send_json(event)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await emit({"type": "error", "message": "invalid JSON"})
                continue

            mtype = msg.get("type")
            if mtype == "user_message":
                text = (msg.get("text") or "").strip()
                if not text:
                    continue
                await emit({"type": "turn_start"})
                try:
                    await agent.send(text, emit)
                except Exception as e:  # noqa: BLE001
                    await emit({"type": "error", "message": f"{type(e).__name__}: {e}"})
            elif mtype == "reset":
                agent.reset()
                await emit({"type": "reset_ack"})
            else:
                await emit({"type": "error", "message": f"unknown message type: {mtype}"})

    except WebSocketDisconnect:
        return
