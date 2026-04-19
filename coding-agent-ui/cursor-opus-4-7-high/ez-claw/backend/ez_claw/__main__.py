from __future__ import annotations

import os
import sys

import uvicorn


def main() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("error: ANTHROPIC_API_KEY is not set", file=sys.stderr)
        sys.exit(1)

    port = int(os.environ.get("EZ_CLAW_PORT", "8765"))
    workdir = os.path.abspath(os.environ.get("EZ_CLAW_WORKDIR", os.getcwd()))
    model = os.environ.get("EZ_CLAW_MODEL", "claude-opus-4-5")

    print(f"ez-claw starting")
    print(f"  model:   {model}")
    print(f"  workdir: {workdir}")
    print(f"  url:     http://localhost:{port}")

    uvicorn.run(
        "ez_claw.server:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
