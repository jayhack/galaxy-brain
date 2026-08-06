#!/usr/bin/env python3
"""Build the public `dataset.json` that `index.html` reads.

Combines the synthetic_manifest.json produced by gen_dataset.py with
derived per-square occupancy ground truth (from the FEN strings).
"""
from __future__ import annotations

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.normpath(os.path.join(HERE, "..", "dataset"))
OUT = os.path.normpath(os.path.join(HERE, "..", "dataset.json"))


def fen_to_occupancy(fen: str) -> list[list[int]]:
    """Ranks 8..1 top-to-bottom, files a..h left-to-right. 1=occupied, 0=empty."""
    grid = []
    for row in fen.split(" ")[0].split("/"):
        r = []
        for ch in row:
            if ch.isdigit():
                r.extend([0] * int(ch))
            else:
                r.append(1)
        grid.append(r)
    return grid


def fen_to_side(fen: str) -> list[list[str]]:
    """Per-square side label: '.' empty, 'W' white, 'B' black."""
    grid = []
    for row in fen.split(" ")[0].split("/"):
        r = []
        for ch in row:
            if ch.isdigit():
                r.extend(["."] * int(ch))
            else:
                r.append("W" if ch.isupper() else "B")
        grid.append(r)
    return grid


def main():
    with open(os.path.join(DATASET_DIR, "synthetic_manifest.json")) as f:
        synthetic = json.load(f)

    items = []
    for s in synthetic:
        items.append({
            **s,
            "kind": "synthetic",
            "occupancy": fen_to_occupancy(s["fen"]),
            "side": fen_to_side(s["fen"]),
        })

    out = {
        "version": 1,
        "description": ("oblique-gambit evaluation dataset. All images are "
                        "synthetic: a flat 8x8 chess board is rendered with "
                        "piece glyphs and a lighting gradient, then a 3D "
                        "rotation + perspective projection is applied to "
                        "simulate oblique-angle phone photos against a "
                        "blurred tabletop background. See the 'How well it "
                        "works' tab for the real-photo discussion."),
        "images": items,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=2)
    print("wrote", OUT, "with", len(items), "images")


if __name__ == "__main__":
    main()
