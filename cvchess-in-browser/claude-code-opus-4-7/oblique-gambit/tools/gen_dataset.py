#!/usr/bin/env python3
"""
Generate the synthetic portion of the oblique-gambit evaluation dataset.

Renders chess boards in a flat orthographic view (8x8 tiles + piece glyphs +
a lighting gradient), then applies a perspective warp + background blur to
simulate oblique-angle photos of a physical board.
"""
from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass, asdict

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "dataset"))
os.makedirs(OUT_DIR, exist_ok=True)

# ---------- piece glyphs (unicode) ----------
# Both sides use the FILLED (black) unicode variants so the glyphs are solid
# shapes rather than hollow outlines — the silhouette is then coloured by
# `fill` (light vs dark), which is what the CV pipeline's brightness
# classifier reads.  Using \u2654..\u2659 for white would produce hollow
# outlines on the rendered board, indistinguishable from an empty tile.
GLYPHS = {
    "K": "\u265A", "Q": "\u265B", "R": "\u265C", "B": "\u265D", "N": "\u265E", "P": "\u265F",
    "k": "\u265A", "q": "\u265B", "r": "\u265C", "b": "\u265D", "n": "\u265E", "p": "\u265F",
}


def fen_to_grid(fen: str) -> list[list[str]]:
    rows = fen.split(" ")[0].split("/")
    grid = []
    for r in rows:
        row = []
        for ch in r:
            if ch.isdigit():
                row.extend(["."] * int(ch))
            else:
                row.append(ch)
        grid.append(row)
    return grid


def find_font() -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Apple Symbols.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Symbol.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Apple Color Emoji.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, 110)
            except Exception:
                continue
    return ImageFont.load_default()


FONT = find_font()


@dataclass
class Style:
    name: str
    light: tuple
    dark: tuple
    border: tuple
    bg: tuple
    piece_light: tuple
    piece_dark: tuple


STYLES = [
    Style("wood", (239, 217, 183), (180, 136, 98), (70, 40, 20), (42, 34, 26),
          (250, 245, 230), (32, 22, 16)),
    Style("tournament", (234, 230, 220), (110, 140, 90), (30, 30, 30), (55, 60, 55),
          (245, 245, 240), (18, 22, 18)),
    Style("blue-white", (230, 235, 240), (90, 120, 160), (30, 30, 40), (25, 30, 40),
          (248, 248, 252), (12, 16, 24)),
    Style("vinyl", (245, 240, 215), (70, 60, 50), (15, 15, 15), (60, 50, 40),
          (250, 248, 240), (15, 14, 13)),
    Style("themed", (240, 220, 200), (140, 70, 70), (50, 20, 20), (40, 28, 28),
          (252, 240, 230), (20, 10, 10)),
]


def render_flat_board(grid: list[list[str]], style: Style,
                      size: int = 1024) -> Image.Image:
    """Render an 8x8 board with pieces, top-down, with a subtle gradient."""
    img = Image.new("RGB", (size, size), style.light)
    draw = ImageDraw.Draw(img)
    cell = size // 8
    for r in range(8):
        for c in range(8):
            x0, y0 = c * cell, r * cell
            x1, y1 = x0 + cell, y0 + cell
            is_light = (r + c) % 2 == 0
            draw.rectangle([x0, y0, x1, y1],
                           fill=style.light if is_light else style.dark)
    # draw a thin grid line on top (visual cue, not required for the detector)
    for i in range(9):
        p = i * cell
        draw.line([(p, 0), (p, size)], fill=(0, 0, 0), width=1)
        draw.line([(0, p), (size, p)], fill=(0, 0, 0), width=1)

    # pieces
    for r in range(8):
        for c in range(8):
            ch = grid[r][c]
            if ch == ".":
                continue
            glyph = GLYPHS.get(ch)
            if not glyph:
                continue
            fill = style.piece_light if ch.isupper() else style.piece_dark
            stroke = style.piece_dark if ch.isupper() else style.piece_light
            # subtle shadow under the piece (same silhouette offset a few px)
            shadow_offset = cell // 22
            try:
                bbox = FONT.getbbox(glyph)
                tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            except Exception:
                tw, th = cell * 3 // 4, cell * 3 // 4
            cx = c * cell + cell // 2 - tw // 2 - bbox[0]
            cy = r * cell + cell // 2 - th // 2 - bbox[1]
            # shadow
            draw.text((cx + shadow_offset, cy + shadow_offset), glyph,
                      font=FONT, fill=(0, 0, 0, 90))
            # piece silhouette, coloured by side
            draw.text((cx, cy), glyph, font=FONT, fill=fill,
                      stroke_width=3, stroke_fill=stroke)

    # add a radial-ish lighting gradient so tiles aren't perfectly uniform
    arr = np.array(img, dtype=np.float32)
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = W * 0.4, H * 0.35
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    shade = 1.0 - 0.35 * (r / r.max()) ** 1.3
    arr = arr * shade[..., None]
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def apply_perspective(flat: Image.Image, pitch: float, yaw: float, roll: float,
                      scale: float, canvas: tuple[int, int],
                      bg: tuple[int, int, int]) -> tuple[Image.Image, list]:
    """
    Apply a perspective transformation to `flat` at the given euler angles
    (degrees) and paste it onto a canvas with a blurred background colour.
    Returns (composited_image, destination_corners [TL,TR,BR,BL]).
    """
    W, H = flat.size
    # board in 3D world-space, centred at origin, size 2
    s = scale
    src3d = np.array([
        [-s, -s, 0],  # TL
        [s, -s, 0],   # TR
        [s, s, 0],    # BR
        [-s, s, 0],   # BL
    ], dtype=np.float64)

    def rot_mat(pitch_deg, yaw_deg, roll_deg):
        px = math.radians(pitch_deg)
        py = math.radians(yaw_deg)
        pz = math.radians(roll_deg)
        Rx = np.array([[1, 0, 0],
                       [0, math.cos(px), -math.sin(px)],
                       [0, math.sin(px), math.cos(px)]])
        Ry = np.array([[math.cos(py), 0, math.sin(py)],
                       [0, 1, 0],
                       [-math.sin(py), 0, math.cos(py)]])
        Rz = np.array([[math.cos(pz), -math.sin(pz), 0],
                       [math.sin(pz), math.cos(pz), 0],
                       [0, 0, 1]])
        return Rz @ Ry @ Rx

    R = rot_mat(pitch, yaw, roll)
    cam_dist = 5.0
    focal = max(canvas) * 0.9
    # rotate & translate the board into camera space (camera at +Z looking -Z)
    pts = (R @ src3d.T).T
    pts[:, 2] += cam_dist  # push into camera
    # perspective project
    proj = np.zeros((4, 2))
    proj[:, 0] = pts[:, 0] * focal / pts[:, 2] + canvas[0] / 2
    proj[:, 1] = pts[:, 1] * focal / pts[:, 2] + canvas[1] / 2

    # compute the perspective transform coefficients PIL wants:
    # for PIL.Image.transform with method=PERSPECTIVE, we need the inverse map
    # from destination to source (x, y) -> (u, v).  Build it via homography.
    src = np.array([[0, 0], [W, 0], [W, H], [0, H]], dtype=np.float64)
    dst = proj
    # solve homography dst->src (because PIL samples from source for each dst px)
    A = []
    for (xd, yd), (xs, ys) in zip(dst, src):
        A.append([xd, yd, 1, 0, 0, 0, -xs * xd, -xs * yd])
        A.append([0, 0, 0, xd, yd, 1, -ys * xd, -ys * yd])
    A = np.asarray(A)
    B = src.reshape(8)
    coeffs = np.linalg.solve(A, B)

    # background: blurred monochrome with slight noise
    bg_img = Image.new("RGB", canvas, bg)
    draw = ImageDraw.Draw(bg_img)
    # add a big dim colour blob for "table"
    blob = Image.new("RGB", canvas, bg)
    bdraw = ImageDraw.Draw(blob)
    bdraw.ellipse([canvas[0] * -0.2, canvas[1] * 0.5,
                   canvas[0] * 1.2, canvas[1] * 1.4],
                  fill=(bg[0] + 18, bg[1] + 12, bg[2] + 8))
    blob = blob.filter(ImageFilter.GaussianBlur(40))
    bg_img.paste(blob, (0, 0), None)

    # add film-grain noise
    noise = (np.random.randn(canvas[1], canvas[0], 3) * 6).astype(np.int16)
    bg_arr = np.array(bg_img, dtype=np.int16) + noise
    bg_img = Image.fromarray(np.clip(bg_arr, 0, 255).astype(np.uint8))

    # transform the board
    warped = flat.convert("RGBA").transform(
        canvas, Image.PERSPECTIVE, coeffs, resample=Image.BICUBIC)
    # a subtle drop shadow under the warped quad
    shadow_mask = warped.split()[3].filter(ImageFilter.GaussianBlur(18))
    shadow = Image.new("RGBA", canvas, (0, 0, 0, 180))
    shadow.putalpha(shadow_mask)
    bg_img = bg_img.convert("RGBA")
    bg_img.alpha_composite(Image.new("RGBA", canvas, (0, 0, 0, 0)).__class__.new(
        "RGBA", canvas, (0, 0, 0, 0)) if False else shadow,
        dest=(6, 10))
    bg_img.alpha_composite(warped, dest=(0, 0))

    # mild global blur for "phone photo" look
    final = bg_img.convert("RGB").filter(ImageFilter.GaussianBlur(0.7))
    # light vignette
    yy, xx = np.mgrid[0:canvas[1], 0:canvas[0]]
    cx, cy = canvas[0] / 2, canvas[1] / 2
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    vig = 1.0 - 0.35 * (r / r.max()) ** 2.2
    arr = np.array(final, dtype=np.float32) * vig[..., None]
    final = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    return final, proj.tolist()


# ------------- scene definitions -------------
FEN_STARTING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
FEN_EMPTY = "8/8/8/8/8/8/8/8"
FEN_MIDGAME = "r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP3PPP/RNBQ1RK1"
FEN_ENDGAME = "8/5k2/8/4P3/8/3K4/8/8"
FEN_KIWIPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R"
FEN_PROMO = "r3k2r/p1p2ppp/2n2n2/8/8/2N2N2/P1P2PPP/R3K2R"
FEN_SPARSE = "4k3/8/2n5/8/3P4/8/5B2/4K3"
FEN_KINGS_ONLY = "4k3/8/8/8/8/8/8/4K3"


def main():
    random.seed(7)
    np.random.seed(7)

    scenes = [
        # (id, fen, style_idx, pitch, yaw, roll, scale, canvas, bg_tint, note)
        ("starting-wood-oblique",   FEN_STARTING, 0,  55, -12, 0,  1.35, (1280, 900),
         (60, 45, 35), "Wooden board, starting position, oblique from behind white."),
        ("starting-tournament-tilt", FEN_STARTING, 1, 42, 18, -3, 1.30, (1280, 900),
         (55, 58, 55), "Tournament green/cream, oblique with slight roll."),
        ("midgame-blue",             FEN_MIDGAME,  2, 50, -8, 2,  1.30, (1280, 900),
         (30, 35, 50), "Blue/white club board mid-game, strong oblique."),
        ("endgame-vinyl",            FEN_ENDGAME,  3, 60, 5,  1,  1.35, (1280, 900),
         (65, 55, 45), "Vinyl roll-up, near-empty endgame, near-oblique."),
        ("kiwipete-themed",          FEN_KIWIPETE, 4, 45, -22, -2, 1.30, (1280, 900),
         (48, 35, 35), "Red-themed board, heavy position, oblique-left."),
        ("promo-wood-hiangle",       FEN_PROMO,    0, 30, 25, 4,  1.25, (1280, 900),
         (55, 42, 32), "Wood board, closer to top-down, oblique-right."),
        ("sparse-tournament",        FEN_SPARSE,   1, 58, -3, -1, 1.35, (1280, 900),
         (55, 58, 55), "Tournament board, very sparse position, low camera."),
        ("kings-only-blue-extreme",  FEN_KINGS_ONLY, 2, 68, 20, 3, 1.25, (1280, 900),
         (30, 35, 50), "Extreme oblique, only two kings — stress test."),
        ("starting-wood-low",        FEN_STARTING, 0, 66, 0, 0,  1.15, (1280, 900),
         (60, 45, 35), "Very low-angle wood, near-flat grazing view."),
        ("empty-tournament",         FEN_EMPTY,    1, 50, 0, 0, 1.35, (1280, 900),
         (55, 58, 55), "Empty tournament board — occupancy sanity check."),
    ]

    manifest = []
    for (sid, fen, style_idx, pitch, yaw, roll, scale, canvas, bg, note) in scenes:
        grid = fen_to_grid(fen)
        flat = render_flat_board(grid, STYLES[style_idx])
        img, corners = apply_perspective(flat, pitch, yaw, roll, scale,
                                         canvas, bg)
        path = os.path.join(OUT_DIR, f"{sid}.jpg")
        img.save(path, quality=85)
        manifest.append({
            "id": sid,
            "file": f"dataset/{sid}.jpg",
            "source": "synthetic (rendered by tools/gen_dataset.py)",
            "attribution": "oblique-gambit synthetic dataset, CC0",
            "style": STYLES[style_idx].name,
            "camera": {"pitch": pitch, "yaw": yaw, "roll": roll, "scale": scale},
            "board_corners_px": [
                {"x": round(p[0], 1), "y": round(p[1], 1)} for p in corners
            ],
            "fen": fen,
            "note": note,
        })
        print("wrote", path)

    with open(os.path.join(OUT_DIR, "synthetic_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("wrote", os.path.join(OUT_DIR, "synthetic_manifest.json"))


if __name__ == "__main__":
    main()
