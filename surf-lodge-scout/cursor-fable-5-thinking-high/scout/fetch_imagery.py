#!/usr/bin/env python3
"""Fetch and annotate satellite imagery for the surf-lodge-scout report.

Tiles come from the Esri World Imagery service (free to use with attribution:
"Esri, Maxar, Earthstar Geographics, and the GIS User Community"). Each image
is stitched from XYZ tiles, cropped to a geographic bounding box, annotated
with site/break markers, and written to img/ so the report renders offline.

Run: python3 scout/fetch_imagery.py
"""

import math
import os
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFont

TILE_URL = ("https://server.arcgisonline.com/ArcGIS/rest/services/"
            "World_Imagery/MapServer/tile/{z}/{y}/{x}")
CACHE = os.path.expanduser("~/.cache/surf-lodge-tiles")
OUT = os.path.join(os.path.dirname(__file__), "..", "img")

ACCENT = (255, 196, 0)      # candidate sites
SURF = (64, 220, 255)       # surf breaks
WARN = (255, 80, 80)        # hazards


def deg2xy(lat, lon, z):
    n = 2.0 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
    return x, y


def fetch_tile(z, x, y):
    path = os.path.join(CACHE, f"{z}_{x}_{y}.jpg")
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        req = urllib.request.Request(
            TILE_URL.format(z=z, x=x, y=y),
            headers={"User-Agent": "galaxy-brain-surf-lodge-scout/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
        time.sleep(0.15)
    return Image.open(path).convert("RGB")


def build_map(bbox, z):
    """bbox = (lat_min, lon_min, lat_max, lon_max). Returns (image, to_px)."""
    x0, y1 = deg2xy(bbox[2], bbox[1], z)   # top-left (north-west)
    x1, y0 = deg2xy(bbox[0], bbox[3], z)   # bottom-right (south-east)
    tx0, ty0, tx1, ty1 = int(x0), int(y1), int(x1), int(y0)
    img = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            img.paste(fetch_tile(z, tx, ty), ((tx - tx0) * 256, (ty - ty0) * 256))
    crop = (int((x0 - tx0) * 256), int((y1 - ty0) * 256),
            int((x1 - tx0) * 256), int((y0 - ty0) * 256))
    img = img.crop(crop)

    def to_px(lat, lon):
        x, y = deg2xy(lat, lon, z)
        return ((x - tx0) * 256 - crop[0], (y - ty0) * 256 - crop[1])

    return img, to_px


def font(size):
    for name in ("/System/Library/Fonts/Helvetica.ttc",
                 "/System/Library/Fonts/Supplemental/Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, size, index=1)
        except Exception:
            try:
                return ImageFont.truetype(name, size)
            except Exception:
                continue
    return ImageFont.load_default()


def annotate(img, to_px, markers, scale_m=None, lat_for_scale=None, z=None):
    d = ImageDraw.Draw(img, "RGBA")
    f = font(22)
    fs = font(17)
    for m in markers:
        x, y = to_px(m["lat"], m["lon"])
        color = {"site": ACCENT, "surf": SURF, "warn": WARN}[m.get("kind", "site")]
        r = 9 if m.get("kind") == "site" else 7
        d.ellipse([x - r, y - r, x + r, y + r], fill=color,
                  outline=(0, 0, 0), width=2)
        label = m["label"]
        fnt = f if m.get("kind") == "site" else fs
        tw = d.textlength(label, font=fnt)
        dx, dy = m.get("offset", (14, -12))
        tx, ty = x + dx, y + dy
        if dx < 0:
            tx -= tw
        pad = 5
        d.rounded_rectangle([tx - pad, ty - pad, tx + tw + pad, ty + 24 + pad],
                            radius=6, fill=(8, 12, 18, 200))
        d.text((tx, ty), label, font=fnt, fill=color)
    if scale_m and z:
        # meters per pixel at this latitude/zoom
        mpp = 156543.0339 * math.cos(math.radians(lat_for_scale)) / (2 ** z)
        px = scale_m / mpp
        w, h = img.size
        x0, y0 = w - px - 30, h - 34
        d.line([x0, y0, x0 + px, y0], fill=(255, 255, 255), width=3)
        d.line([x0, y0 - 6, x0, y0 + 6], fill=(255, 255, 255), width=3)
        d.line([x0 + px, y0 - 6, x0 + px, y0 + 6], fill=(255, 255, 255), width=3)
        lbl = f"{scale_m} m" if scale_m < 1000 else f"{scale_m // 1000} km"
        d.text((x0 + px / 2 - 20, y0 - 30), lbl, font=fs, fill=(255, 255, 255))
    return img


MAPS = [
    {
        "out": "kona-corridor.jpg",
        "bbox": (19.5520, -156.0050, 19.6470, -155.9480),
        "z": 15,
        "scale": 2000,
        "markers": [
            {"lat": 19.63935, "lon": -155.99700, "label": "Kailua Pier / town", "kind": "surf", "offset": (14, -10)},
            {"lat": 19.62384, "lon": -155.98577, "label": "75-5976 Alii Dr — $1.895M (watch)", "kind": "site"},
            {"lat": 19.60620, "lon": -155.97560, "label": "Banyans (year-round A-frame)", "kind": "surf"},
            {"lat": 19.60140, "lon": -155.97480, "label": "Lyman's (left point)", "kind": "surf"},
            {"lat": 19.59460, "lon": -155.97140, "label": "Magic Sands", "kind": "surf"},
            {"lat": 19.58030, "lon": -155.96820, "label": "Kahalu'u (beginner reef)", "kind": "surf"},
            {"lat": 19.58553, "lon": -155.97023, "label": "78-6600 Alii Dr — RS-7.5, no lodge", "kind": "warn"},
            {"lat": 19.56373, "lon": -155.96435, "label": "78-111-A Holua Rd — THE PICK", "kind": "site", "offset": (-14, -34)},
            {"lat": 19.56330, "lon": -155.96480, "label": "He'eia Bay", "kind": "surf", "offset": (-14, 16)},
        ],
    },
    {
        "out": "holua-site.jpg",
        "bbox": (19.5594, -155.9700, 19.5680, -155.9580),
        "z": 18,
        "scale": 200,
        "markers": [
            {"lat": 19.56373, "lon": -155.96435, "label": "78-111-A Holua Rd (TMK 3-7-8-012-045)", "kind": "site", "offset": (-14, -34)},
            {"lat": 19.56330, "lon": -155.96480, "label": "He'eia Bay (bodyboard/surf cove)", "kind": "surf", "offset": (-14, 18)},
            {"lat": 19.56120, "lon": -155.96300, "label": "Keauhou Bay (boat ramp, canoe club)", "kind": "surf", "offset": (14, 6)},
            {"lat": 19.56560, "lon": -155.96080, "label": "Kona Country Club", "kind": "surf", "offset": (14, -10)},
        ],
    },
    {
        "out": "alii5976-site.jpg",
        "bbox": (19.6195, -155.9920, 19.6280, -155.9800),
        "z": 18,
        "scale": 200,
        "markers": [
            {"lat": 19.62384, "lon": -155.98577, "label": "75-5976 Alii Dr (V-1.25, oceanfront)", "kind": "site", "offset": (14, -34)},
        ],
    },
    {
        "out": "sunset-site.jpg",
        "bbox": (21.6680, -158.0520, 21.6830, -158.0310),
        "z": 17,
        "scale": 500,
        "markers": [
            {"lat": 21.67566, "lon": -158.03902, "label": "59-75 Hoalua St — $3.95M", "kind": "site", "offset": (14, -34)},
            {"lat": 21.67900, "lon": -158.04150, "label": "Sunset Beach (the wave)", "kind": "surf", "offset": (14, -10)},
            {"lat": 21.67000, "lon": -158.04780, "label": "Ke Nui Rd erosion strip — homes lost 2022 & 2024", "kind": "warn", "offset": (14, -34)},
        ],
    },
    {
        "out": "hanalei-site.jpg",
        "bbox": (22.1930, -159.5560, 22.2280, -159.4880),
        "z": 16,
        "scale": 1000,
        "markers": [
            {"lat": 22.22065, "lon": -159.54520, "label": "5-7094 Kuhio Hwy — $3.999M", "kind": "site", "offset": (14, -34)},
            {"lat": 22.22300, "lon": -159.54350, "label": "Waikokos (reef)", "kind": "surf", "offset": (14, -10)},
            {"lat": 22.20900, "lon": -159.52100, "label": "Pine Trees", "kind": "surf", "offset": (14, 8)},
            {"lat": 22.21250, "lon": -159.50050, "label": "Hanalei Pier / The Bowl", "kind": "surf", "offset": (-14, -10)},
            {"lat": 22.20400, "lon": -159.50800, "label": "Hanalei R. floodplain (Apr 2018: ~50 in / 24 h)", "kind": "warn", "offset": (-14, 10)},
        ],
    },
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for spec in MAPS:
        img, to_px = build_map(spec["bbox"], spec["z"])
        img = annotate(img, to_px, spec["markers"], spec.get("scale"),
                       (spec["bbox"][0] + spec["bbox"][2]) / 2, spec["z"])
        # cap width for file size
        if img.width > 1400:
            img = img.resize((1400, int(img.height * 1400 / img.width)),
                             Image.LANCZOS)
        path = os.path.join(OUT, spec["out"])
        img.save(path, quality=82)
        print(spec["out"], img.size, f"{os.path.getsize(path)//1024} KB")


if __name__ == "__main__":
    main()
