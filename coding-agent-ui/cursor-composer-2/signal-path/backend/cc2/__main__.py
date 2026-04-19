from __future__ import annotations

import os
import sys

import uvicorn


def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        print("error: OPENAI_API_KEY is not set", file=sys.stderr)
        sys.exit(1)

    port = int(os.environ.get("CC2_PORT", "8765"))
    workdir = os.path.abspath(os.environ.get("CC2_WORKDIR", os.getcwd()))
    model = os.environ.get("CC2_MODEL", "gpt-4o")

    print("signal-path (cursor-composer-2) starting")
    print(f"  model:   {model}")
    print(f"  workdir: {workdir}")
    print(f"  url:     http://localhost:{port}")

    uvicorn.run(
        "cc2.server:app",
        host="127.0.0.1",
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
